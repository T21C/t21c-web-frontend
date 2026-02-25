import { rmSync, renameSync, existsSync } from 'fs';

const TMP = 'dist.tmp';
const OUT = 'dist';

if (!existsSync(TMP)) {
  console.error('swap-dist: dist.tmp not found (build may have failed)');
  process.exit(1);
}
if (existsSync(OUT)) {
  rmSync(OUT, { recursive: true, force: true });
}
renameSync(TMP, OUT);
console.log('swapped build folders');
