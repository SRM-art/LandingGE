import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args=process.argv.slice(2);
const dryRun=args.includes('--dry-run');
if(args.some(arg=>arg!=='--dry-run'))throw new Error('Argumento no admitido. Usa --dry-run para validar sin publicar.');
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(!dryRun){
  const origin=new URL(config.vars.PUBLIC_ORIGIN);
  const database=config.d1_databases.find(item=>item.binding==='DB');
  if(origin.protocol!=='https:'||origin.origin!==config.vars.PUBLIC_ORIGIN)throw new Error('PUBLIC_ORIGIN debe ser un origen HTTPS exacto.');
  if(!database||!database.database_id||/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(database.database_id))throw new Error('Configura el identificador real de D1 antes de publicar.');
  if(!config.workers_dev&&!config.routes?.length)throw new Error('Configura una ruta explícita de Cloudflare o una vista de pruebas antes de publicar.');
}

for(const command of [
  ['node_modules/astro/bin/astro.mjs','build','--config','astro.cloudflare.config.mjs'],
  ['node_modules/wrangler/bin/wrangler.js','deploy','--config','dist-cloudflare/server/wrangler.json',...args],
]){
  const result=spawnSync(process.execPath,command,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
