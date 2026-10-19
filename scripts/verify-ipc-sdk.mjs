import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

function verify(name) {
  const root = fileURLToPath(new URL(`../vendor/${name}/`, import.meta.url));
  const metadata = JSON.parse(readFileSync(`${root}source.json`, 'utf8'));
  const files = Object.keys(metadata.files).sort();
  const inventory = readdirSync(root).filter((file) => file !== 'source.json').sort();
  if (JSON.stringify(inventory) !== JSON.stringify(files)) throw new Error(`${name} inventory differs from its pinned manifest`);
  for (const file of files) {
    if (!/^[.a-z0-9_-]+$/i.test(file) || file === '.' || file === '..') throw new Error('Invalid vendor source filename');
    const actual = createHash('sha256').update(readFileSync(`${root}${file}`)).digest('hex');
    if (actual !== metadata.files[file]) throw new Error(`${name} source mismatch: ${file}`);
  }
  return metadata;
}

const sdk = verify('adofai-ipc');
if (sdk.source !== 'https://github.com/KGH1113/adofai-ipc' || sdk.version !== '2.0.0' || sdk.protocolVersion !== 3
  || !/^[a-f0-9]{40}$/.test(sdk.sourceRevision) || typeof sdk.sourceDirty !== 'boolean') throw new Error('Invalid ADOFAI IPC provenance');
if (!readFileSync(new URL('../vendor/adofai-ipc/LICENSE', import.meta.url), 'utf8').includes('MIT License')) throw new Error('ADOFAI IPC license missing');
const contract = verify('tufhelper-ipc');
const definition = readFileSync(new URL('../vendor/tufhelper-ipc/index.js', import.meta.url), 'utf8');
if (contract.source !== 'tufhelper2/ipc/main.tsp' || contract.contractId !== 'tufhelperlite'
  || !/^[a-f0-9]{64}$/.test(contract.contractSourceSha256)
  || !definition.includes(`"hash": "${contract.contractHash}"`)) throw new Error('Invalid TUFHelper contract provenance');
console.log(`Verified ADOFAI IPC ${sdk.version} and TUFHelper contract ${contract.contractHash}`);
