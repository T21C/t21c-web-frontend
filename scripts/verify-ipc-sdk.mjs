import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../vendor/adofai-ipc/', import.meta.url));
const metadata = JSON.parse(readFileSync(`${root}source.json`, 'utf8'));
if (metadata.sourceDirty !== false || metadata.version !== '2.0.0' || metadata.protocolVersion !== 3 || !/^[a-f0-9]{40}$/.test(metadata.sourceRevision)) {
  throw new Error('Invalid ADOFAI-IPC source provenance');
}
const files = Object.keys(metadata.files).sort();
if (JSON.stringify(readdirSync(`${root}src`).sort()) !== JSON.stringify(files)) throw new Error('ADOFAI-IPC source inventory differs from its manifest');
for (const file of files) {
  if (!/^[a-z0-9-]+\.ts$/i.test(file)) throw new Error('Invalid ADOFAI-IPC source filename');
  const actual = createHash('sha256').update(readFileSync(`${root}src/${file}`)).digest('hex');
  if (actual !== metadata.files[file]) throw new Error(`ADOFAI-IPC source mismatch: ${file}`);
}
if (!readFileSync(`${root}LICENSE`, 'utf8').includes('MIT License')) throw new Error('ADOFAI-IPC license missing');
console.log(`Verified ADOFAI-IPC ${metadata.version}, protocol ${metadata.protocolVersion}, source ${metadata.sourceRevision}`);
