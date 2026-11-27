import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const [folder,bucket,mode]=process.argv.slice(2);
if(!folder||!/^[a-z0-9-]{3,63}$/.test(bucket??'')||!['--local','--remote'].includes(mode??'')){
  throw new Error('Indica el paquete, el bucket y --local o --remote.');
}
const directory=realpathSync(folder);
const manifest=JSON.parse(readFileSync(resolve(directory,'manifest.json'),'utf8'));
for(const {key,contentType} of manifest.objects){
  if(!/^(originals|variants)\/[a-f0-9-]+\.(webp|jpg|png)$/i.test(key))throw new Error('Clave de imagen inválida en el paquete.');
  const path=realpathSync(resolve(directory,'media',key));
  if(!path.startsWith(resolve(directory,'media')+sep))throw new Error('Ruta de imagen inválida en el paquete.');
  const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',`${bucket}/${key}`,
    '--config','wrangler.jsonc','--file',path,'--content-type',contentType,mode],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
