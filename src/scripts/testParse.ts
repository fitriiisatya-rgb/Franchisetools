import fs from 'fs';
import path from 'path';
import { ingestWorkbook } from '../lib/ingest';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: tsx src/scripts/testParse.ts <path-to-xlsx>');
    process.exit(1);
  }
  const buffer = fs.readFileSync(filePath);
  const result = await ingestWorkbook(buffer, path.basename(filePath));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
