import { NextRequest, NextResponse } from "next/server";
import { requireRole, HttpError } from "@/lib/session";
import { parseCustomers, upsertCustomers } from "@/lib/import";
import { bulkReassignByHaversine } from "@/lib/distance";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireRole("TRANSCOM_ADMIN");
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const records = parseCustomers(buffer);
    const result = await upsertCustomers(records);
    await bulkReassignByHaversine();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json(
      { error: "Failed to parse spreadsheet. Check the file format." },
      { status: 500 }
    );
  }
}
