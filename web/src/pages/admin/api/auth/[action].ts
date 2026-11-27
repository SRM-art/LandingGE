import type { APIRoute } from 'astro';
import { AuthError,setupOwner,login,cookieName,cookieOptions,SESSION_MS,requireActor,invite,resendInvite,requestReset,completePassword,reauthenticate,revokeSessions,changeUserState,changePassword,requestEmailChange,confirmEmail,limit } from '../../../../server/auth';
import { allowSetup, production } from '#runtime';
import { BodyTooLarge, boundedBody } from '../../../../server/request-body';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const publicLimits = new Map([['setup',10],['login',30],['recover',15],['activate',20],['reset',20],['confirm-email',20]]);
export const POST:APIRoute=async(ctx)=>{
 try{
  if(!ctx.request.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('Formato no permitido.',415);
  const text=new TextDecoder().decode(await boundedBody(ctx.request,8192));
  let input:any;try{input=JSON.parse(text);}catch{throw new AuthError('Formulario inválido.');}
  if(!input || typeof input!=='object' || Array.isArray(input))throw new AuthError('Formulario inválido.');
  const action=ctx.params.action,ua=ctx.request.headers.get('user-agent')||'';
  const string=(key:string)=>{if(typeof input[key]!=='string' || input[key].length>1024)throw new AuthError('Formulario incompleto.');return input[key] as string;};
  const confirmation=()=>{if(string('password')!==string('confirmation'))throw new AuthError('Las contraseñas no coinciden.');};
  const threshold=publicLimits.get(action ?? '');
  if(threshold)await limit('auth:'+action+':'+ctx.clientAddress,threshold,15*60000);
  if(action==='setup'||action==='login'){
   if(action==='setup'){
    if(!allowSetup(input.email,input.setupToken))throw new AuthError('Configuración inicial no autorizada.',403);
    confirmation();
   }
   const token=action==='setup'?await setupOwner(input.email,input.password,ua):await login(input.email,input.password,ua,ctx.clientAddress);
   ctx.cookies.set(cookieName,token,{...cookieOptions(ctx.url),maxAge:SESSION_MS/1000});
   return json({ok:true,redirect:'/admin'});
  }
  if(action==='recover'){
   // A throttled address and an unknown address receive the same public response.
   try{await requestReset(input.email);}catch(e){
    if(e instanceof AuthError && e.status!==429)throw e;
    if(!(e instanceof AuthError))console.error('[auth] No se pudo enviar el enlace de recuperación');
   }
   return json({ok:true,message:'Si el correo corresponde a una cuenta activa, recibirás un enlace.'+(!production?' Puedes revisar el buzón local.':'')});
  }
  if(action==='activate'||action==='reset'){
   confirmation();await completePassword(string('token'),action==='activate'?'invite':'reset',input.password);
   return json({ok:true,redirect:'/admin/login?notice=password'});
  }
  if(action==='confirm-email'){(await confirmEmail(string('token')));return json({ok:true,redirect:'/admin/login?notice=email'});}
  const actor=(await requireActor(ctx.locals.user));
  switch(action){
   case 'invite':await invite(actor,input.email);return json({ok:true,message:production?'Invitación enviada por correo.':'Invitación creada. Abre el buzón local para activar la cuenta.',refresh:true});
   case 'resend':(await resendInvite(actor,string('id')));break;
   case 'disable':(await changeUserState(actor,string('id'),false));break;
   case 'restore':(await changeUserState(actor,string('id'),true));break;
   case 'revoke':{
    const id=string('id'),sessionId=input.sessionId===undefined?undefined:string('sessionId');
    (await revokeSessions(actor,id,sessionId));
    if(id===actor.id && (!sessionId||sessionId===actor.sessionId)){ctx.cookies.delete(cookieName,cookieOptions(ctx.url));return json({ok:true,redirect:'/admin/login?notice=closed'});}
    break;
   }
   case 'reauth':await reauthenticate(actor,input.password);return json({ok:true,message:'Identidad verificada durante 5 minutos. Puedes repetir la acción.'});
   case 'password':confirmation();await changePassword(actor,input.currentPassword,input.password);ctx.cookies.delete(cookieName,cookieOptions(ctx.url));return json({ok:true,redirect:'/admin/login?notice=password'});
   case 'email':await requestEmailChange(actor,input.currentPassword,input.email);return json({ok:true,message:'Confirma el cambio desde el mensaje enviado al nuevo correo.'});
   default:throw new AuthError('Acción no encontrada.',404);
  }
  return json({ok:true,refresh:true});
 }catch(error){
  if(error instanceof BodyTooLarge)return json({error:'Solicitud demasiado grande.'},413);
  if(error instanceof AuthError)return json({error:error.message},error.status);
  console.error('[auth] Falló una operación');return json({error:'No se pudo completar la operación. Revisa el estado e inténtalo de nuevo.'},500);
 }
};
