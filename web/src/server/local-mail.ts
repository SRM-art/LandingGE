import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataDir } from './db.ts';
export type LocalMail = { id?:string; to:string; purpose:string; token?:string; expires?:number; text?:string; createdAt?:number };
export function localMailEnabled(){ return process.env.LOCAL_PREVIEW==='1' || import.meta.env?.DEV===true; }
const path=resolve(dataDir,'local-mailbox.json');
export function localMessages():LocalMail[]{
 if(!localMailEnabled())return [];
 return existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[];
}
export function sendLocalMail(mail:LocalMail){
 if(!localMailEnabled())throw new Error('El proveedor de correo de producción no está configurado.');
 const messages=[{...mail,id:randomUUID(),createdAt:Date.now()},...localMessages()].slice(0,80);
 const temporary=path+'.tmp';writeFileSync(temporary,JSON.stringify(messages),{mode:0o600});renameSync(temporary,path);
}
