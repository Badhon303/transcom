import fs from "fs";
import path from "path";
import { parseCustomers, upsertCustomers } from "../src/lib/import";
import { bulkReassignByHaversine } from "../src/lib/distance";

// Default to the geocoded spreadsheet in the workspace root (one level above /web).
const DEFAULT_FILE = path.resolve(
  __dirname,
  "..",
  "..",
  "List_Damages_Phase_2_02.07.26_geocoded.xlsx"
);

async function main() {
  const file = process.argv[2] || DEFAULT_FILE;
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    console.error("Usage: npm run db:import -- <path-to-xlsx>");
    process.exit(1);
  }
  console.log(`Reading: ${file}`);
  const buffer = fs.readFileSync(file);
  const records = parseCustomers(buffer);
  console.log(`Parsed ${records.length} customer rows.`);

  const result = await upsertCustomers(records);
  console.log("Import result:", result);

  console.log("Assigning nearest RBU (Haversine)...");
  await bulkReassignByHaversine();
  console.log("Done.");
}

main().then(() => process.exit(0));
