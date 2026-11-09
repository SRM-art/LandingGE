import type { APIRoute } from 'astro';
import { AuthError,setupOwner,login,cookieName,SESSION_MS,requireActor,invite,resendInvite,requestReset,completePassword,reauthenticate,revokeSessions,changeUserState,changePassword,requestEmailChange,confirmEmail,limit } from '../../../../server/auth';
import { localMailEnabled } from '../../../../server/local-mail';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
export const POST:APIRoute=async(ctx)=>{
 try{
  if(!localMailEnabled())throw new AuthError('Este adaptador es exclusivamente local.',403);
  if(!ctx.request.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('Formato no permitido.',415);
  const text=await ctx.request.text();if(Buffer.byteLength(text)>8192)throw new AuthError('Solicitud demasiado grande.',413);
  let input:any;try{input=JSON.parse(text);}catch{throw new AuthError('Formulario inválido.');}
  if(!input || typeof input!=='object' || Array.isArray(input))throw new AuthError('Formulario inválido.');
  const action=ctx.params.action,ua=ctx.request.headers.get('user-agent')||'';
  const string=(key:string)=>{if(typeof input[key]!=='string' || input[key].length>1024)throw new AuthError('Formulario incompleto.');return input[key] as string;};
  const confirmation=()=>{if(string('password')!==string('confirmation'))throw new AuthError('Las contraseñas no coinciden.');};
  // Persistent local limiter; never trust X-Forwarded-For supplied by the client.
  limit('auth:global',200,15*60000);limit('auth:origin:'+ctx.clientAddress,100,15*60000);
  if(action==='setup'||action==='login'){
   if(action==='setup')confirmation();
   const token=action==='setup'?await setupOwner(input.email,input.password,ua):await login(input.email,input.password,ua);
   ctx.cookies.set(cookieName,token,{httpOnly:true,sameSite:'strict',secure:ctx.url.protocol==='https:',path:'/',maxAge:SESSION_MS/1000});
   return json({ok:true,redirect:'/admin'});
  }
  if(action==='recover'){
   // A throttled address and an unknown address receive the same public response.
   try{requestReset(input.email);}catch(e){if(!(e instanceof AuthError&&e.status===429))throw e;}
   return json({ok:true,message:'Si el correo corresponde a una cuenta activa, recibirás un enlace. En esta versión puedes revisar el buzón local.'});
  }
  if(action==='activate'||action==='reset'){
   confirmation();await completePassword(string('token'),action==='activate'?'invite':'reset',input.password);
   return json({ok:true,redirect:'/admin/login?notice=password'});
  }
  if(action==='confirm-email'){confirmEmail(string('token'));return json({ok:true,redirect:'/admin/login?notice=email'});}
  const actor=requireActor(ctx.locals.user);
  switch(action){
   case 'invite':invite(actor,input.email);return json({ok:true,message:'Invitación creada. Abre el buzón local para activar la cuenta.',refresh:true});
   case 'resend':resendInvite(actor,string('id'));break;
   case 'disable':changeUserState(actor,string('id'),false);break;
   case 'restore':changeUserState(actor,string('id'),true);break;
   case 'revoke':{
    const id=string('id'),sessionId=input.sessionId===undefined?undefined:string('sessionId');
    revokeSessions(actor,id,sessionId);
    if(id===actor.id && (!sessionId||sessionId===actor.sessionId)){ctx.cookies.delete(cookieName,{path:'/'});return json({ok:true,redirect:'/admin/login?notice=closed'});}
    break;
   }
   case 'reauth':await reauthenticate(actor,input.password);return json({ok:true,message:'Identidad verificada durante 5 minutos. Puedes repetir la acción.'});
   case 'password':confirmation();await changePassword(actor,input.currentPassword,input.password);ctx.cookies.delete(cookieName,{path:'/'});return json({ok:true,redirect:'/admin/login?notice=password'});
   case 'email':await requestEmailChange(actor,input.currentPassword,input.email);return json({ok:true,message:'Confirma el cambio desde el mensaje enviado al nuevo correo en el buzón local.'});
   default:throw new AuthError('Acción no encontrada.',404);
  }
  return json({ok:true,refresh:true});
 }catch(error){
  if(error instanceof AuthError)return json({error:error.message},error.status);
  console.error('[auth] Operation failed');return json({error:'No se pudo completar la operación. Revisa el estado e inténtalo de nuevo.'},500);
 }
};
