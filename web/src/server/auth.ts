import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { all, one, run, transaction } from './db.ts';
import {derivePassword,passwordScheme,sendMail} from '#runtime';

export const cookieName = 'ge_account_session';
export const SESSION_MS = 12 * 60 * 60 * 1000;
export const IDLE_MS = 60 * 60 * 1000;
export class AuthError extends Error {
 status:number;
 constructor(message: string, status = 400) { super(message); this.status=status; }
}
export type Identity = { id:string; email:string; role:'owner'|'admin'; sessionId:string; securityVersion:number; reauthenticatedAt:number };
export function hash(token:string){ return createHash('sha256').update(token).digest('hex'); }
export function localHost(url:URL){ return ['localhost','127.0.0.1','[::1]'].includes(url.hostname); }
export async function ownerExists(){ return !!(await one("SELECT 1 FROM auth_user WHERE role='owner'")); }
function now(){return Date.now();}
export function emailAddress(value:unknown){
 if(typeof value!=='string')throw new AuthError('Escribe un correo válido.');
 const email=value.trim().toLowerCase();
 if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError('Escribe un correo válido.');
 return email;
}
function passwordPolicy(value:unknown): asserts value is string {
 if(typeof value!=='string' || [...value].length<15 || [...value].length>128)throw new AuthError('Usa una contraseña de 15 a 128 caracteres. Puedes usar una frase con espacios.');
 if(/^(.)\1+$/u.test(value) || /^(1234567890|password|contrase[nñ]a|qwerty)[\d\W]*$/iu.test(value))throw new AuthError('Elige una contraseña menos predecible.');
}
let hashing=0;
async function derive(password:string,salt:string):Promise<Buffer>{
 if(hashing>=2)throw new AuthError('Estamos procesando otros accesos. Inténtalo en unos segundos.',503);
 hashing++; try{return await derivePassword(password,salt);}finally{hashing--;}
}
async function passwordHash(password:unknown){passwordPolicy(password);const salt=randomBytes(16).toString('hex');return passwordScheme+':'+salt+':'+(await derive(password,salt)).toString('hex');}
const dummy=passwordScheme+':'+ '0'.repeat(32)+':'+ '00'.repeat(64);
async function passwordMatches(password:unknown,encoded:string|undefined){
 if(typeof password!=='string' || [...password].length>128)return false;
 const parts=(encoded||dummy).split(':');
 if(parts.length!==6 || parts.slice(0,4).join(':')!==passwordScheme)return false;
 const expected=Buffer.from(parts[5],'hex');const actual=await derive(password,parts[4]);
 return expected.length===actual.length && timingSafeEqual(expected,actual) && !!encoded;
}
export async function event(action:string,actor:string|null=null,target:string|null=null){(await run('INSERT INTO auth_event VALUES(?,?,?,?,?)',randomUUID(),actor,target,action,now()));}
export async function limit(key:string,max:number,period:number){
 (await transaction(async ()=>{
  const t=now();(await run('DELETE FROM auth_limit WHERE expires_at<=?',t));
  const k=hash(key), row=(await one('SELECT * FROM auth_limit WHERE key=? AND expires_at>?',k,t));
  if(row && row.count>=max)throw new AuthError('Demasiados intentos. Espera unos minutos antes de volver a intentar.',429);
  (await run('INSERT INTO auth_limit VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',k,t+period));
 }));
}
function clientLabel(ua:string){
 const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Navegador';
 const os=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Sistema no identificado';
 return `${browser} · ${os}`;
}
async function issueSession(user:any,ua:string){
 const token=randomBytes(32).toString('hex'), t=now();
 (await run('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?,NULL,?)',randomUUID(),user.id,hash(token),user.security_version,t,t,t+SESSION_MS,t+IDLE_MS,t,clientLabel(ua)));
 (await event('login',user.id,user.id));return token;
}
export async function identity(token:string|undefined,touch=false):Promise<Identity|null>{
 if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
 const t=now();const row=(await one(`SELECT u.id,u.email,u.role,u.security_version,s.id AS session_id,s.last_seen_at,s.reauthenticated_at FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active'`,hash(token),t,t));
 if(!row)return null;
 if(touch && t-row.last_seen_at>=60000)(await run('UPDATE auth_session SET last_seen_at=?,idle_expires_at=MIN(expires_at,?) WHERE id=?',t,t+IDLE_MS,row.session_id));
 return {id:row.id,email:row.email,role:row.role,sessionId:row.session_id,securityVersion:row.security_version,reauthenticatedAt:row.reauthenticated_at};
}
export async function authenticated(token:string|undefined){return !!(await identity(token));}
export async function requireActor(actor:Identity|null|undefined,owner=false,fresh=false):Promise<Identity>{
 if(!actor)throw new AuthError('Inicia sesión de nuevo.',401);
 const t=now();const current=(await one(`SELECT u.role,s.reauthenticated_at FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.id=? AND u.id=? AND u.state='active' AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.security_version=?`,actor.sessionId,actor.id,t,t,actor.securityVersion));
 if(!current)throw new AuthError('Tu sesión terminó. Inicia sesión de nuevo.',401);
 if(owner && current.role!=='owner')throw new AuthError('Esta función es exclusiva del propietario.',403);
 if(fresh && t-current.reauthenticated_at>5*60000)throw new AuthError('Confirma tu contraseña en «Verificar identidad» y repite la acción.',428);
 return actor;
}
export async function setupOwner(email:unknown,password:unknown,ua:string){
 if((await ownerExists()))throw new AuthError('La cuenta del propietario ya está configurada.',409);
 const address=emailAddress(email), encoded=await passwordHash(password);
 return (await transaction(async ()=>{
  if((await ownerExists()))throw new AuthError('La cuenta del propietario ya está configurada.',409);
  const id=randomUUID(),t=now();
  (await run("INSERT INTO auth_user VALUES(?,?,'owner','active',1,?,?,?)",id,address,t,t,t));
  (await run('INSERT INTO auth_credential VALUES(?,?,?)',id,encoded,t));(await event('owner_setup',id,id));
  return (await issueSession({id,security_version:1},ua));
 }));
}
export async function login(email:unknown,password:unknown,ua:string){
 const address=emailAddress(email),key='login:'+address;
 const attempts=(await one('SELECT count FROM auth_limit WHERE key=? AND expires_at>?',hash(key),now()));
 if(attempts?.count>=5)throw new AuthError('Demasiados intentos. Espera 15 minutos antes de volver a intentar.',429);
 const user=(await one('SELECT u.*,c.password_hash FROM auth_user u LEFT JOIN auth_credential c ON c.user_id=u.id WHERE u.email=?',address));
 const valid=await passwordMatches(password,user?.password_hash);
 if(!valid || !user || user.state!=='active'){(await limit(key,5,15*60000));(await event('login_failed',null,user?.id||null));throw new AuthError('Correo o contraseña incorrectos.',401);}
 return (await transaction(async ()=>{
  const current=(await one('SELECT * FROM auth_user WHERE id=?',user.id));
  if(!current || current.state!=='active' || current.security_version!==user.security_version)throw new AuthError('Tu acceso cambió. Inicia sesión de nuevo.',401);
  (await run('DELETE FROM auth_limit WHERE key=?',hash(key)));return (await issueSession(current,ua));
 }));
}
export async function revokeSession(token:string|undefined){const actor=(await identity(token));if(actor){(await run('UPDATE auth_session SET revoked_at=? WHERE id=?',now(),actor.sessionId));(await event('logout',actor.id,actor.id));}}
async function invalidate(userId:string){
 const t=now();(await run('UPDATE auth_user SET security_version=security_version+1,updated_at=? WHERE id=?',t,userId));
 (await run('UPDATE auth_session SET revoked_at=COALESCE(revoked_at,?) WHERE user_id=?',t,userId));
 (await run('UPDATE auth_token SET revoked_at=COALESCE(revoked_at,?) WHERE user_id=? AND used_at IS NULL',t,userId));
}
async function issueToken(user:any,purpose:'invite'|'reset'|'email',targetEmail:string|null=null){
 const t=now(),token=randomBytes(32).toString('hex');
 (await run('UPDATE auth_token SET revoked_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL AND revoked_at IS NULL',t,user.id,purpose));
 const expires=t+(purpose==='invite'?24*60*60000:20*60000);
 (await run('INSERT INTO auth_token VALUES(?,?,?,?,?,?,?,NULL,NULL,?)',randomUUID(),user.id,hash(token),purpose,user.security_version,t,expires,targetEmail));
 return {to:targetEmail||user.email,token,purpose,expires};
}
export async function invite(actor:Identity,email:unknown){
 (await requireActor(actor,true,true));const address=emailAddress(email);(await limit('mail:'+address,3,60*60000));
 const mail=(await transaction(async ()=>{
  (await requireActor(actor,true,true));if((await one('SELECT 1 FROM auth_user WHERE email=?',address)))throw new AuthError('Ese correo ya tiene una cuenta. Puedes reenviar su invitación o restaurarla.',409);
  const id=randomUUID(),t=now();(await run("INSERT INTO auth_user VALUES(?,?,'admin','pending',1,NULL,?,?)",id,address,t,t));
  (await event('user_invited',actor.id,id));return (await issueToken({id,email:address,security_version:1},'invite'));
 }));(await sendMail(mail));
}
export async function resendInvite(actor:Identity,id:string){
 (await requireActor(actor,true,true));const user=(await one("SELECT * FROM auth_user WHERE id=? AND state='pending'",id));
 if(!user)throw new AuthError('La cuenta no está pendiente de activación.');(await limit('mail:'+user.email,3,60*60000));
 const mail=await transaction(async ()=>{
  await requireActor(actor,true,true);
  const current=await one("SELECT * FROM auth_user WHERE id=? AND state='pending'",id);
  if(!current)throw new AuthError('La cuenta no está pendiente de activación.');
  return issueToken(current,'invite');
 });
 await sendMail(mail);
}
export async function requestReset(email:unknown){
 const address=emailAddress(email);(await limit('mail:'+address,3,60*60000));
 const mail=await transaction(async ()=>{
  const user=await one("SELECT * FROM auth_user WHERE email=? AND state='active'",address);
  if(!user)return null;
  const link=await issueToken(user,'reset');
  await event('reset_requested',null,user.id);
  return link;
 });
 if(mail)await sendMail(mail);
}
async function sendNotice(to:string,text:string){
 try{await sendMail({to,purpose:'notice',text});}
 catch{console.error('[auth] No se pudo enviar el aviso de seguridad');}
}
async function validToken(token:string,purpose:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new AuthError('El enlace no es válido, ya se usó o venció.');
 const row=(await one(`SELECT t.*,u.state,u.email,u.security_version AS current_version FROM auth_token t JOIN auth_user u ON u.id=t.user_id WHERE t.token_hash=? AND t.purpose=? AND t.expires_at>? AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.security_version=u.security_version`,hash(token),purpose,now()));
 if(!row || (purpose==='invite'?row.state!=='pending':row.state!=='active'))throw new AuthError('El enlace no es válido, ya se usó o venció.');
 return row;
}
export async function completePassword(token:string,purpose:'invite'|'reset',password:unknown){
 const initial=(await validToken(token,purpose));const encoded=await passwordHash(password);
 (await transaction(async ()=>{
  const row=(await validToken(token,purpose));if(row.security_version!==initial.security_version)throw new AuthError('Solicita un enlace nuevo.');
  const t=now();(await run('UPDATE auth_token SET used_at=? WHERE id=?',t,row.id));
  (await run('INSERT INTO auth_credential VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash,changed_at=excluded.changed_at',row.user_id,encoded,t));
  (await run("UPDATE auth_user SET state='active',verified_at=COALESCE(verified_at,?),updated_at=? WHERE id=?",t,t,row.user_id));
  (await invalidate(row.user_id));(await event(purpose==='invite'?'user_activated':'password_reset',row.user_id,row.user_id));
 }));await sendNotice(initial.email,'Tu contraseña se ha establecido. Inicia sesión con ella. Las sesiones anteriores se cerraron.');
}
export async function reauthenticate(actor:Identity,password:unknown){
 (await requireActor(actor));const cred=(await one('SELECT password_hash FROM auth_credential WHERE user_id=?',actor.id));
 (await limit('reauth:'+actor.id,5,15*60000));
 if(!await passwordMatches(password,cred?.password_hash))throw new AuthError('La contraseña no es correcta.',401);
 (await transaction(async ()=>{(await requireActor(actor));(await run('UPDATE auth_session SET reauthenticated_at=? WHERE id=?',now(),actor.sessionId));}));
}
export async function users(actor:Identity){
 (await requireActor(actor,true));const t=now();
 return (await all(`SELECT u.id,u.email,u.role,u.state,u.created_at,(SELECT count(*) FROM auth_session s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active') AS sessions FROM auth_user u ORDER BY u.role DESC,u.created_at`,t,t));
}
export async function sessions(actor:Identity,id:string){
 (await requireActor(actor));if(id!==actor.id)(await requireActor(actor,true));
 const t=now();return (await all(`SELECT s.id,s.created_at,s.last_seen_at,s.expires_at,s.client_label FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active' ORDER BY s.created_at DESC`,id,t,t));
}
export async function revokeSessions(actor:Identity,id:string,sessionId?:string){
 (await transaction(async ()=>{
  (await requireActor(actor,id!==actor.id,id!==actor.id));if(!(await one('SELECT 1 FROM auth_user WHERE id=?',id)))throw new AuthError('Cuenta no encontrada.',404);
  if(sessionId){if(!(await one('SELECT 1 FROM auth_session WHERE id=? AND user_id=?',sessionId,id)))throw new AuthError('Sesión no encontrada.',404);(await run('UPDATE auth_session SET revoked_at=COALESCE(revoked_at,?) WHERE id=?',now(),sessionId));}
  else (await invalidate(id));
  (await event(sessionId?'session_revoked':'sessions_revoked',actor.id,id));
 }));
}
export async function changeUserState(actor:Identity,id:string,restore:boolean){
 const mail=(await transaction(async ()=>{
  (await requireActor(actor,true,true));const user=(await one('SELECT * FROM auth_user WHERE id=?',id));
  if(!user)throw new AuthError('Cuenta no encontrada.',404);
  if(user.role==='owner')throw new AuthError('No se puede desactivar ni modificar el rol del propietario.',403);
  if(restore && user.state!=='disabled')throw new AuthError('La cuenta no está desactivada.');
  (await invalidate(id));(await run('UPDATE auth_user SET state=?,updated_at=? WHERE id=?',restore?'pending':'disabled',now(),id));
  (await event(restore?'user_restored':'user_disabled',actor.id,id));
  return restore?(await issueToken({...user,security_version:user.security_version+1},'invite')):null;
 }));if(mail)(await sendMail(mail));
}
export async function changePassword(actor:Identity,current:unknown,next:unknown){
 await reauthenticate(actor,current);const encoded=await passwordHash(next);
 (await transaction(async ()=>{(await requireActor(actor));(await run('UPDATE auth_credential SET password_hash=?,changed_at=? WHERE user_id=?',encoded,now(),actor.id));(await invalidate(actor.id));(await event('password_changed',actor.id,actor.id));}));
 await sendNotice(actor.email,'Tu contraseña cambió y todas tus sesiones se cerraron.');
}
export async function requestEmailChange(actor:Identity,password:unknown,next:unknown){
 await reauthenticate(actor,password);const email=emailAddress(next);
 if(email===actor.email)throw new AuthError('Escribe un correo diferente.');(await limit('mail:'+email,3,60*60000));
 const mail=(await transaction(async ()=>{(await requireActor(actor));if((await one('SELECT 1 FROM auth_user WHERE email=?',email)))throw new AuthError('Ese correo no está disponible.',409);return (await issueToken((await one('SELECT * FROM auth_user WHERE id=?',actor.id)),'email',email));}));(await sendMail(mail));
}
export async function confirmEmail(token:string){
 const old=(await transaction(async ()=>{const row=(await validToken(token,'email'));if((await one('SELECT 1 FROM auth_user WHERE email=?',row.target_email)))throw new AuthError('Ese correo ya no está disponible.');(await run('UPDATE auth_token SET used_at=? WHERE id=?',now(),row.id));(await run('UPDATE auth_user SET email=?,verified_at=?,updated_at=? WHERE id=?',row.target_email,now(),now(),row.user_id));(await invalidate(row.user_id));(await event('email_changed',row.user_id,row.user_id));return row.email;}));
 await sendNotice(old,'Se cambió el correo de tu cuenta. Todas sus sesiones se cerraron.');
}

