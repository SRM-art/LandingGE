import { mkdirSync, readdirSync, copyFileSync, constants } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('demo-assets');
const destination = resolve(process.env.GE_DATA_DIR || '.local', 'seed-assets');
mkdirSync(destination, { recursive: true });
for (const filename of readdirSync(source)) {
  if (!filename.endsWith('.webp')) continue;
  try {
    copyFileSync(resolve(source, filename), resolve(destination, filename), constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
console.log('Recursos de demostración preparados para la revisión local.');
