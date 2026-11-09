import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
const data=resolve(process.env.GE_DATA_DIR||'.local');
if(!existsSync(resolve(data,'catalog.sqlite')))throw new Error('Inicia el sitio una vez antes de crear una copia.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const destination=resolve(data,'backups',stamp);mkdirSync(destination,{recursive:true});
const source=new DatabaseSync(resolve(data,'catalog.sqlite'),{readOnly:true});
await backup(source,resolve(destination,'catalog.sqlite'));source.close();
const snapshot=new DatabaseSync(resolve(destination,'catalog.sqlite'));
snapshot.exec('UPDATE session SET expires_at=0');
if(snapshot.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='auth_user'").get()){
 snapshot.exec('UPDATE auth_user SET security_version=security_version+1; UPDATE auth_session SET revoked_at=0; UPDATE auth_token SET revoked_at=0;');
}
const media=snapshot.prepare('SELECT storage_key FROM media').all();snapshot.close();
for(const {storage_key} of media){const original=resolve(data,storage_key);const target=resolve(destination,storage_key);if(!original.startsWith(data+sep)||!target.startsWith(destination+sep))throw new Error('Ruta de archivo no válida.');mkdirSync(dirname(target),{recursive:true});copyFileSync(original,target);}
writeFileSync(resolve(destination,'copia.json'),JSON.stringify({created_at:new Date().toISOString(),media:media.length,description:'Base consistente, originales referenciados y sesiones revocadas. Las variantes se regeneran.'},null,2));
console.log('Copia creada: '+destination+'\nArchivos originales conservados: '+media.length);
