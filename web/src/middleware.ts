import { defineMiddleware } from 'astro:middleware';
import { identity, cookieName, localHost } from './server/auth.ts';
import { requestActor } from './server/request-context.ts';
import {production,publicOrigin,indexPublicSite} from '#runtime';
const publicAdmin=new Set(['/admin/login','/admin/configurar','/admin/recuperar','/admin/restablecer','/admin/activar','/admin/confirmar-correo','/admin/correo-local',...['setup','login','recover','activate','reset','confirm-email'].map(a=>'/admin/api/auth/'+a)]);
export const onRequest=defineMiddleware(async(ctx,next)=>{
 if(production){
  if(!publicOrigin() || ctx.url.origin!==publicOrigin())return new Response('Host no permitido.',{status:403});
 }else{
  if(!(import.meta.env.DEV || process.env.LOCAL_PREVIEW==='1') || !localHost(ctx.url))return new Response('Esta versión es exclusivamente local.',{status:403});
  const host=ctx.request.headers.get('host');
  if(!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return new Response('Host no permitido.',{status:403});
 }
 const path=ctx.url.pathname.replace(/\/$/,'')||'/';
 const admin=path==='/admin'||path.startsWith('/admin/');
 ctx.locals.user=(await identity(ctx.cookies.get(cookieName)?.value,admin));
 ctx.locals.isAdmin=!!ctx.locals.user;
 const privateAdmin=admin&&!publicAdmin.has(path);
 let response:Response;
 const error=(message:string,status:number)=>new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json'}});
 if(privateAdmin&&!ctx.locals.isAdmin)response=path.startsWith('/admin/api/')?error('Inicia sesión de nuevo.',401):ctx.redirect('/admin/login');
 else if(path.startsWith('/admin/usuarios') && ctx.locals.user?.role!=='owner')response=new Response('Solo el propietario puede gestionar usuarios.',{status:403});
 else {
 if(!['GET','HEAD','OPTIONS'].includes(ctx.request.method)){
  if(ctx.request.headers.get('origin')!==ctx.url.origin)return new Response('Origen no permitido.',{status:403});
  if(ctx.request.headers.get('x-ge-admin')!=='1')return error('Solicitud no permitida.',403);
 }
 response=await requestActor.run(ctx.locals.user?.id||null,()=>next());
 }
 response.headers.set('Cache-Control','no-store');
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options',admin?'DENY':'SAMEORIGIN');
 response.headers.set('Referrer-Policy',admin?'no-referrer':'strict-origin-when-cross-origin');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 response.headers.set('Content-Security-Policy',`object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${admin?"'none'":"'self'"}`);
 if(production && ctx.url.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
 if(!indexPublicSite()||admin)response.headers.set('X-Robots-Tag','noindex, nofollow');
 else if(response.status===404)response.headers.set('X-Robots-Tag','noindex, follow');
 return response;
});
