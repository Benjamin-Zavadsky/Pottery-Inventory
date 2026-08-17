import { copyFileSync, chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'scripts', 'git-hooks');
const target = join(root, '.git', 'hooks');

if (!existsSync(target)) {
  // Not a git checkout (e.g. installed as a dependency) — nothing to do.
  process.exit(0);
}

for (const hook of ['pre-commit', 'pre-push']) {
  const dest = join(target, hook);
  copyFileSync(join(source, hook), dest);
  chmodSync(dest, 0o755);
}

console.log('Installed git hooks: pre-commit, pre-push');
