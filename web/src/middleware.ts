import { defineMiddleware } from 'astro:middleware';
import { identity, cookieName, localHost } from './server/auth.ts';
import { requestActor } from './server/request-context.ts';
const publicAdmin=new Set(['/admin/login','/admin/configurar','/admin/recuperar','/admin/restablecer','/admin/activar','/admin/confirmar-correo','/admin/correo-local',...['setup','login','recover','activate','reset','confirm-email'].map(a=>'/admin/api/auth/'+a)]);
export const onRequest=defineMiddleware(async(ctx,next)=>{
 if(!(import.meta.env.DEV || process.env.LOCAL_PREVIEW==='1') || !localHost(ctx.url))return new Response('Esta versión es exclusivamente local.',{status:403});
 const host=ctx.request.headers.get('host');
 if(!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return new Response('Host no permitido.',{status:403});
 const path=ctx.url.pathname.replace(/\/$/,'')||'/';
 ctx.locals.user=identity(ctx.cookies.get(cookieName)?.value,path.startsWith('/admin'));
 ctx.locals.isAdmin=!!ctx.locals.user;
 const privateAdmin=path.startsWith('/admin')&&!publicAdmin.has(path);
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
 response.headers.set('Cache-Control','no-store');response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('X-Frame-Options',ctx.url.pathname.startsWith('/admin')?'DENY':'SAMEORIGIN');response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');response.headers.set('X-Robots-Tag','noindex, nofollow');
 if(path.startsWith('/admin'))response.headers.set('Referrer-Policy','no-referrer');
 return response;
});
