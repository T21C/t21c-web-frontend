import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CLIENT_VERSION, PROTOCOL_VERSION } from 'adofai-ipc/transport';

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

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const sdkRoot = new URL('../', import.meta.resolve('adofai-ipc'));
const sdk = JSON.parse(readFileSync(new URL('package.json', sdkRoot), 'utf8'));
const pinned = lock.packages['node_modules/adofai-ipc'];
if (sdk.name !== 'adofai-ipc' || manifest.dependencies['adofai-ipc'] !== sdk.version
  || CLIENT_VERSION !== sdk.version || PROTOCOL_VERSION !== 3
  || pinned?.version !== sdk.version || pinned.link
  || !pinned.resolved?.startsWith('https://registry.npmjs.org/adofai-ipc/-/')
  || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(pinned.integrity || '')) {
  throw new Error('ADOFAI IPC must use an exact npm version with a registry integrity lock');
}
if (!readFileSync(new URL('LICENSE', sdkRoot), 'utf8').includes('MIT License')) throw new Error('ADOFAI IPC license missing');
const contract = verify('tufhelper-ipc');
const contractPackage = JSON.parse(readFileSync(new URL('../vendor/tufhelper-ipc/package.json', import.meta.url), 'utf8'));
const definition = readFileSync(new URL('../vendor/tufhelper-ipc/index.js', import.meta.url), 'utf8');
if (contract.source !== 'tufhelper2/ipc/main.tsp' || contract.contractId !== 'tufhelperlite'
  || !/^[a-f0-9]{64}$/.test(contract.contractSourceSha256)
  || !definition.includes(`"hash": "${contract.contractHash}"`)
  || contractPackage.dependencies['adofai-ipc'] !== sdk.version) throw new Error('Invalid TUFHelper contract provenance');
console.log(`Verified ADOFAI IPC ${sdk.version} and TUFHelper contract ${contract.contractHash}`);
