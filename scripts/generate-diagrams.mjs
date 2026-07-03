import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const diagramsDir = join(process.cwd(), 'docs', 'diagrams');
const mmdc = join(process.cwd(), 'node_modules', '.bin', 'mmdc');
const files = readdirSync(diagramsDir).filter((f) => f.endsWith('.mmd'));

console.log(`Rendering ${files.length} diagram(s)...\n`);

for (const file of files) {
  const input = join(diagramsDir, file);
  const output = input.replace(/\.mmd$/, '.png');
  const width = file.includes('er-diagram') ? 1400 : 1200;

  execSync(
    `"${mmdc}" -i "${input}" -o "${output}" -b white -w ${width}`,
    { stdio: 'inherit' }
  );

  console.log(`  ✓ ${file} → ${file.replace('.mmd', '.png')}`);
}

console.log('\nDone. Re-export ARCHITECTURE.md to PDF to see updated diagrams.');
