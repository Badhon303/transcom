"use client";

import Link from "next/link";
import { useState } from "react";
import type { ImportResult } from "@/lib/import";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import/customers", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setResult(await res.json());
    } else {
      setError((await res.json()).error || "Import failed");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <Link href="/admin/customers" className="text-sm text-brand">
        ← Back to customers
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
        Import customers
      </h1>
      <p className="text-slate-500 text-sm mb-6">
        Upload the geocoded spreadsheet (header on row 3, coordinates as
        &quot;lat, lng&quot;). Existing customers are matched by DB Code / Master
        ID and updated; new ones are created. Rows without coordinates are still
        imported and flagged for geocoding.
      </p>

      <div className="bg-white rounded-xl border p-6">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm mb-4"
        />
        <button
          onClick={upload}
          disabled={!file || busy}
          className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Importing…" : "Import"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 text-sm space-y-1 bg-slate-50 rounded-lg p-4">
            <p className="font-medium text-slate-800">Import complete:</p>
            <p>Total rows parsed: {result.total}</p>
            <p className="text-green-700">Created: {result.imported}</p>
            <p className="text-blue-700">Updated: {result.updated}</p>
            <p className="text-amber-700">Missing coordinates: {result.missingCoords}</p>
            <p className="text-slate-500">Missing address: {result.missingAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
