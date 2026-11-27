import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { CatalogError } from '../../../domain/catalog-error';
import {storeMedia,removeMedia} from '#media';
import { all,run,audit,transaction } from '../../../server/db.ts';
import { revokeSession,cookieName,cookieOptions,requireActor,limit,AuthError } from '../../../server/auth.ts';
import {saveSlide,changeSlideState} from '../../../server/slides.ts';
import {saveProduct,saveProject,saveContent,changeState} from '../../../server/mutations.ts';
import {manageCity} from '../../../server/cities.ts';
import {manageCategory} from '../../../server/categories.ts';
import {BodyTooLarge,boundedBody} from '../../../server/request-body.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
export const POST:APIRoute=async({params,request,cookies,locals,url})=>{
 try{
  const action=params.action;
  const actor=await requireActor(locals.user);
  const authorized = <T>(task: () => Promise<T>) => transaction(async () => {
   await requireActor(locals.user);
   return task();
  });
  if(action==='logout'){(await revokeSession(cookies.get(cookieName)?.value));cookies.delete(cookieName,cookieOptions(url));return json({ok:true});}
  if(action==='upload'){
   const mime=request.headers.get('content-type')||'';
   if(!mime.startsWith('multipart/form-data;'))return json({error:'Formato de carga inválido.'},415);
   await limit('upload:'+actor.id,90,15*60000);
   const raw=await boundedBody(request,11*1024*1024);
   const form=await new Response(raw,{headers:{'Content-Type':mime}}).formData();
   const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024||!file.size)return json({error:'Selecciona una imagen de hasta 10 MB.'},400);
   const id=randomUUID();const media=await storeMedia(id,file);
   try {
    await authorized(async () => {
     await run('INSERT INTO media(id,storage_key,original_name,mime,width,height,created_at) VALUES(?,?,?,?,?,?,?)',id,media.key,file.name.slice(0,200),media.mime,media.width,media.height,new Date().toISOString());
     await audit('imagen','Nueva imagen incorporada');
    });
   } catch(error) { await removeMedia(id,media.key); throw error; }
   return json({id,name:file.name,url:'/media/'+id+'/960'});
  }
  if(request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')return json({error:'Formato no permitido.'},415);
  const body=await boundedBody(request,256000);
  let input:unknown;
  try{input=JSON.parse(new TextDecoder().decode(body));}catch{return json({error:'Formulario inválido.'},400);}
  const mutations = new Map<string,(input:unknown)=>Promise<unknown>>([
   ['city',manageCity],['category',manageCategory],['slide',saveSlide],['slide-state',changeSlideState],
   ['product',saveProduct],['project',saveProject],['content',saveContent],['state',changeState],
  ]);
  const mutation=action ? mutations.get(action) : undefined;
  if(mutation)return json(await authorized(()=>mutation(input)));
  return json({error:'Acción desconocida.'},404);
 }catch(error){
  if(error instanceof BodyTooLarge)return json({error:'Solicitud demasiado grande.'},413);
  if(error instanceof AuthError)return json({error:error.message},error.status);
  if(error instanceof CatalogError)return json({error:error.message},400);
  if(error instanceof ZodError)return json({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join(' · ')},400);
  const message=error instanceof Error?error.message:'';
  if(message.includes('UNIQUE constraint'))return json({error:'Ese SKU o referencia ya existe, incluso entre los registros ocultos. Edita o restaura el registro existente.'},400);
  if(message.includes('FOREIGN KEY'))return json({error:'Selecciona referencias válidas antes de guardar.'},400);
  console.error('[catalog-api] Falló una operación');
  return json({error:'No se pudo completar la operación. Inténtalo de nuevo.'},500);
 }
};
export const GET:APIRoute=async({params,locals})=>{if(params.action!=='export')return json({error:'No encontrado.'},404);try{await requireActor(locals.user);}catch(error){if(error instanceof AuthError)return json({error:error.message},error.status);throw error;}await audit('exportar','Exportación del catálogo');const tables=['category','commercial_unit','presentation','measure_unit','product','product_private','measure','technical_sheet','facet','product_facet','country','region','city','sector','project','project_product','media','product_image','project_image','site_settings','slide','service','audit'];return new Response(JSON.stringify({version:1,exported_at:new Date().toISOString(),tables:Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await all(`SELECT * FROM ${t}`))])))},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="gestion-esencial-datos.json"','Cache-Control':'no-store'}});};


