import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { all, one, run, transaction } from './db.ts';
import { sendLocalMail } from './local-mail.ts';

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
export function ownerExists(){ return !!one("SELECT 1 FROM auth_user WHERE role='owner'"); }
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
// Local Node adapter. Do not lower work factors to fit a hosting plan.
const SCRYPT = { N:32768, r:8, p:3, maxmem:64*1024*1024 };
let hashing=0;
async function derive(password:string,salt:string):Promise<Buffer>{
 if(hashing>=2)throw new AuthError('Estamos procesando otros accesos. Inténtalo en unos segundos.',503);
 hashing++;
 try{return await new Promise((resolve,reject)=>scrypt(password,salt,64,SCRYPT,(error,key)=>error?reject(error):resolve(key)));}
 finally{hashing--;}
}
async function passwordHash(password:unknown){passwordPolicy(password);const salt=randomBytes(16).toString('hex');return `scrypt:32768:8:3:${salt}:${(await derive(password,salt)).toString('hex')}`;}
const dummy='scrypt:32768:8:3:00000000000000000000000000000000:'+ '00'.repeat(64);
async function passwordMatches(password:unknown,encoded:string|undefined){
 if(typeof password!=='string' || [...password].length>128)return false;
 const parts=(encoded||dummy).split(':');
 if(parts.length!==6 || parts.slice(0,4).join(':')!=='scrypt:32768:8:3')return false;
 const expected=Buffer.from(parts[5],'hex');const actual=await derive(password,parts[4]);
 return expected.length===actual.length && timingSafeEqual(expected,actual) && !!encoded;
}
export function event(action:string,actor:string|null=null,target:string|null=null){run('INSERT INTO auth_event VALUES(?,?,?,?,?)',randomUUID(),actor,target,action,now());}
export function limit(key:string,max:number,period:number){
 transaction(()=>{
  const t=now();run('DELETE FROM auth_limit WHERE expires_at<=?',t);
  const k=hash(key), row=one('SELECT * FROM auth_limit WHERE key=?',k);
  if(row && row.count>=max)throw new AuthError('Demasiados intentos. Espera unos minutos antes de volver a intentar.',429);
  run('INSERT INTO auth_limit VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',k,t+period);
 });
}
function clientLabel(ua:string){
 const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Navegador';
 const os=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Sistema no identificado';
 return `${browser} · ${os}`;
}
function issueSession(user:any,ua:string){
 const token=randomBytes(32).toString('hex'), t=now();
 run('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?,NULL,?)',randomUUID(),user.id,hash(token),user.security_version,t,t,t+SESSION_MS,t+IDLE_MS,t,clientLabel(ua));
 event('login',user.id,user.id);return token;
}
export function identity(token:string|undefined,touch=false):Identity|null{
 if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
 const t=now();const row=one(`SELECT u.id,u.email,u.role,u.security_version,s.id AS session_id,s.last_seen_at,s.reauthenticated_at FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active'`,hash(token),t,t);
 if(!row)return null;
 if(touch && t-row.last_seen_at>=60000)run('UPDATE auth_session SET last_seen_at=?,idle_expires_at=MIN(expires_at,?) WHERE id=?',t,t+IDLE_MS,row.session_id);
 return {id:row.id,email:row.email,role:row.role,sessionId:row.session_id,securityVersion:row.security_version,reauthenticatedAt:row.reauthenticated_at};
}
export function authenticated(token:string|undefined){return !!identity(token);}
export function requireActor(actor:Identity|null|undefined,owner=false,fresh=false):Identity{
 if(!actor)throw new AuthError('Inicia sesión de nuevo.',401);
 const t=now();const current=one(`SELECT u.role,s.reauthenticated_at FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.id=? AND u.id=? AND u.state='active' AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.security_version=?`,actor.sessionId,actor.id,t,t,actor.securityVersion);
 if(!current)throw new AuthError('Tu sesión terminó. Inicia sesión de nuevo.',401);
 if(owner && current.role!=='owner')throw new AuthError('Esta función es exclusiva del propietario.',403);
 if(fresh && t-current.reauthenticated_at>5*60000)throw new AuthError('Confirma tu contraseña en «Verificar identidad» y repite la acción.',428);
 return actor;
}
export async function setupOwner(email:unknown,password:unknown,ua:string){
 if(ownerExists())throw new AuthError('La cuenta del propietario ya está configurada.',409);
 const address=emailAddress(email), encoded=await passwordHash(password);
 return transaction(()=>{
  if(ownerExists())throw new AuthError('La cuenta del propietario ya está configurada.',409);
  const id=randomUUID(),t=now();
  run("INSERT INTO auth_user VALUES(?,?,'owner','active',1,?,?,?)",id,address,t,t,t);
  run('INSERT INTO auth_credential VALUES(?,?,?)',id,encoded,t);event('owner_setup',id,id);
  return issueSession(one('SELECT * FROM auth_user WHERE id=?',id),ua);
 });
}
export async function login(email:unknown,password:unknown,ua:string){
 const address=emailAddress(email),key='login:'+address;
 const attempts=one('SELECT count FROM auth_limit WHERE key=? AND expires_at>?',hash(key),now());
 if(attempts?.count>=5)throw new AuthError('Demasiados intentos. Espera 15 minutos antes de volver a intentar.',429);
 const user=one('SELECT u.*,c.password_hash FROM auth_user u LEFT JOIN auth_credential c ON c.user_id=u.id WHERE u.email=?',address);
 const valid=await passwordMatches(password,user?.password_hash);
 if(!valid || !user || user.state!=='active'){limit(key,5,15*60000);event('login_failed',null,user?.id||null);throw new AuthError('Correo o contraseña incorrectos.',401);}
 return transaction(()=>{
  const current=one('SELECT * FROM auth_user WHERE id=?',user.id);
  if(!current || current.state!=='active' || current.security_version!==user.security_version)throw new AuthError('Tu acceso cambió. Inicia sesión de nuevo.',401);
  run('DELETE FROM auth_limit WHERE key=?',hash(key));return issueSession(current,ua);
 });
}
export function revokeSession(token:string|undefined){const actor=identity(token);if(actor){run('UPDATE auth_session SET revoked_at=? WHERE id=?',now(),actor.sessionId);event('logout',actor.id,actor.id);}}
function invalidate(userId:string){
 const t=now();run('UPDATE auth_user SET security_version=security_version+1,updated_at=? WHERE id=?',t,userId);
 run('UPDATE auth_session SET revoked_at=COALESCE(revoked_at,?) WHERE user_id=?',t,userId);
 run('UPDATE auth_token SET revoked_at=COALESCE(revoked_at,?) WHERE user_id=? AND used_at IS NULL',t,userId);
}
function issueToken(user:any,purpose:'invite'|'reset'|'email',targetEmail:string|null=null){
 const t=now(),token=randomBytes(32).toString('hex');
 run('UPDATE auth_token SET revoked_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL AND revoked_at IS NULL',t,user.id,purpose);
 const expires=t+(purpose==='invite'?24*60*60000:20*60000);
 run('INSERT INTO auth_token VALUES(?,?,?,?,?,?,?,NULL,NULL,?)',randomUUID(),user.id,hash(token),purpose,user.security_version,t,expires,targetEmail);
 return {to:targetEmail||user.email,token,purpose,expires};
}
export function invite(actor:Identity,email:unknown){
 requireActor(actor,true,true);const address=emailAddress(email);limit('mail:'+address,3,60*60000);
 const mail=transaction(()=>{
  requireActor(actor,true,true);if(one('SELECT 1 FROM auth_user WHERE email=?',address))throw new AuthError('Ese correo ya tiene una cuenta. Puedes reenviar su invitación o restaurarla.',409);
  const id=randomUUID(),t=now();run("INSERT INTO auth_user VALUES(?,?,'admin','pending',1,NULL,?,?)",id,address,t,t);
  event('user_invited',actor.id,id);return issueToken(one('SELECT * FROM auth_user WHERE id=?',id),'invite');
 });sendLocalMail(mail);
}
export function resendInvite(actor:Identity,id:string){
 requireActor(actor,true,true);const user=one("SELECT * FROM auth_user WHERE id=? AND state='pending'",id);
 if(!user)throw new AuthError('La cuenta no está pendiente de activación.');limit('mail:'+user.email,3,60*60000);
 const mail=transaction(()=>{requireActor(actor,true,true);return issueToken(user,'invite');});sendLocalMail(mail);
}
export function requestReset(email:unknown){
 const address=emailAddress(email);limit('mail:'+address,3,60*60000);
 const user=one("SELECT * FROM auth_user WHERE email=? AND state='active'",address);
 if(user){const mail=transaction(()=>issueToken(user,'reset'));sendLocalMail(mail);event('reset_requested',null,user.id);}
}
function validToken(token:string,purpose:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new AuthError('El enlace no es válido, ya se usó o venció.');
 const row=one(`SELECT t.*,u.state,u.email,u.security_version AS current_version FROM auth_token t JOIN auth_user u ON u.id=t.user_id WHERE t.token_hash=? AND t.purpose=? AND t.expires_at>? AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.security_version=u.security_version`,hash(token),purpose,now());
 if(!row || (purpose==='invite'?row.state!=='pending':row.state!=='active'))throw new AuthError('El enlace no es válido, ya se usó o venció.');
 return row;
}
export async function completePassword(token:string,purpose:'invite'|'reset',password:unknown){
 const initial=validToken(token,purpose);const encoded=await passwordHash(password);
 transaction(()=>{
  const row=validToken(token,purpose);if(row.security_version!==initial.security_version)throw new AuthError('Solicita un enlace nuevo.');
  const t=now();run('UPDATE auth_token SET used_at=? WHERE id=?',t,row.id);
  run('INSERT INTO auth_credential VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash,changed_at=excluded.changed_at',row.user_id,encoded,t);
  run("UPDATE auth_user SET state='active',verified_at=COALESCE(verified_at,?),updated_at=? WHERE id=?",t,t,row.user_id);
  invalidate(row.user_id);event(purpose==='invite'?'user_activated':'password_reset',row.user_id,row.user_id);
 });sendLocalMail({to:initial.email,purpose:'notice',text:'Tu contraseña se ha establecido. Inicia sesión con ella. Las sesiones anteriores se cerraron.'});
}
export async function reauthenticate(actor:Identity,password:unknown){
 requireActor(actor);const cred=one('SELECT password_hash FROM auth_credential WHERE user_id=?',actor.id);
 limit('reauth:'+actor.id,5,15*60000);
 if(!await passwordMatches(password,cred?.password_hash))throw new AuthError('La contraseña no es correcta.',401);
 transaction(()=>{requireActor(actor);run('UPDATE auth_session SET reauthenticated_at=? WHERE id=?',now(),actor.sessionId);});
}
export function users(actor:Identity){
 requireActor(actor,true);const t=now();
 return all(`SELECT u.id,u.email,u.role,u.state,u.created_at,(SELECT count(*) FROM auth_session s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active') AS sessions FROM auth_user u ORDER BY u.role DESC,u.created_at`,t,t);
}
export function sessions(actor:Identity,id:string){
 requireActor(actor);if(id!==actor.id)requireActor(actor,true);
 const t=now();return all(`SELECT s.id,s.created_at,s.last_seen_at,s.expires_at,s.client_label FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.idle_expires_at>? AND s.security_version=u.security_version AND u.state='active' ORDER BY s.created_at DESC`,id,t,t);
}
export function revokeSessions(actor:Identity,id:string,sessionId?:string){
 transaction(()=>{
  requireActor(actor,id!==actor.id,id!==actor.id);if(!one('SELECT 1 FROM auth_user WHERE id=?',id))throw new AuthError('Cuenta no encontrada.',404);
  if(sessionId){if(!one('SELECT 1 FROM auth_session WHERE id=? AND user_id=?',sessionId,id))throw new AuthError('Sesión no encontrada.',404);run('UPDATE auth_session SET revoked_at=COALESCE(revoked_at,?) WHERE id=?',now(),sessionId);}
  else invalidate(id);
  event(sessionId?'session_revoked':'sessions_revoked',actor.id,id);
 });
}
export function changeUserState(actor:Identity,id:string,restore:boolean){
 const mail=transaction(()=>{
  requireActor(actor,true,true);const user=one('SELECT * FROM auth_user WHERE id=?',id);
  if(!user)throw new AuthError('Cuenta no encontrada.',404);
  if(user.role==='owner')throw new AuthError('No se puede desactivar ni modificar el rol del propietario.',403);
  if(restore && user.state!=='disabled')throw new AuthError('La cuenta no está desactivada.');
  invalidate(id);run('UPDATE auth_user SET state=?,updated_at=? WHERE id=?',restore?'pending':'disabled',now(),id);
  event(restore?'user_restored':'user_disabled',actor.id,id);
  return restore?issueToken(one('SELECT * FROM auth_user WHERE id=?',id),'invite'):null;
 });if(mail)sendLocalMail(mail);
}
export async function changePassword(actor:Identity,current:unknown,next:unknown){
 await reauthenticate(actor,current);const encoded=await passwordHash(next);
 transaction(()=>{requireActor(actor);run('UPDATE auth_credential SET password_hash=?,changed_at=? WHERE user_id=?',encoded,now(),actor.id);invalidate(actor.id);event('password_changed',actor.id,actor.id);});
 sendLocalMail({to:actor.email,purpose:'notice',text:'Tu contraseña cambió y todas tus sesiones se cerraron.'});
}
export async function requestEmailChange(actor:Identity,password:unknown,next:unknown){
 await reauthenticate(actor,password);const email=emailAddress(next);
 if(email===actor.email)throw new AuthError('Escribe un correo diferente.');limit('mail:'+email,3,60*60000);
 const mail=transaction(()=>{requireActor(actor);if(one('SELECT 1 FROM auth_user WHERE email=?',email))throw new AuthError('Ese correo no está disponible.',409);return issueToken(one('SELECT * FROM auth_user WHERE id=?',actor.id),'email',email);});sendLocalMail(mail);
}
export function confirmEmail(token:string){
 const old=transaction(()=>{const row=validToken(token,'email');if(one('SELECT 1 FROM auth_user WHERE email=?',row.target_email))throw new AuthError('Ese correo ya no está disponible.');run('UPDATE auth_token SET used_at=? WHERE id=?',now(),row.id);run('UPDATE auth_user SET email=?,verified_at=?,updated_at=? WHERE id=?',row.target_email,now(),now(),row.user_id);invalidate(row.user_id);event('email_changed',row.user_id,row.user_id);return row.email;});
 sendLocalMail({to:old,purpose:'notice',text:'Se cambió el correo de tu cuenta. Todas sus sesiones se cerraron.'});
}

