import {existsSync,cpSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const destination=resolve('.local/review-data');
if(existsSync(destination)){
  console.log('La copia aislada ya existe; se conserva sin sobrescribir.');
}else{
  const output=execFileSync(process.execPath,['scripts/backup.mjs'],{encoding:'utf8',windowsHide:true});
  const snapshot=output.match(/Copia creada: ([^\r\n]+)/)?.[1];
  if(!snapshot)throw new Error('No se pudo localizar la copia consistente.');
  cpSync(snapshot,destination,{recursive:true,errorOnExist:true,force:false});
  console.log('Copia separada de la base y las imágenes preparada; se conservan las cuentas y se revocan sus sesiones anteriores.');
}
const origin=resolve('.local/review-origin.txt');
if(!existsSync(origin))writeFileSync(origin,'https://review-not-published.trycloudflare.com\n');
