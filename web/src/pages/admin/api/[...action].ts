import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import {storeMedia,removeMedia} from '#media';
import { all,run,audit,transaction } from '../../../server/db.ts';
import { revokeSession,cookieName,requireActor,AuthError } from '../../../server/auth.ts';
import {saveSlide,changeSlideState} from '../../../server/slides.ts';
import {saveProduct,saveProject,saveContent,changeState} from '../../../server/mutations.ts';
import {manageCity} from '../../../server/cities.ts';
import {manageCategory} from '../../../server/categories.ts';
import {BodyTooLarge,boundedBody} from '../../../server/request-body.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
export const POST:APIRoute=async({params,request,cookies,locals})=>{
 try{
  const action=params.action;
  (await requireActor(locals.user));
  const authorized = <T>(task: () => Promise<T>) => transaction(async () => {
   await requireActor(locals.user);
   return task();
  });
  if(action==='logout'){(await revokeSession(cookies.get(cookieName)?.value));cookies.delete(cookieName,{path:'/'});return json({ok:true});}
  if(action==='upload'){
   const mime=request.headers.get('content-type')||'';
   if(!mime.startsWith('multipart/form-data;'))return json({error:'Formato de carga inválido.'},415);
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
  const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,256000)));
  const mutations = new Map<string,(input:unknown)=>Promise<unknown>>([
   ['city',manageCity],['category',manageCategory],['slide',saveSlide],['slide-state',changeSlideState],
   ['product',saveProduct],['project',saveProject],['content',saveContent],['state',changeState],
  ]);
  const mutation=action ? mutations.get(action) : undefined;
  if(mutation)return json(await authorized(()=>mutation(input)));
  return json({error:'Acción desconocida.'},404);
 }catch(e:any){if(e instanceof BodyTooLarge)return json({error:'Solicitud demasiado grande.'},413);let message=e.message||'No se pudo guardar.';if(e.issues)message=e.issues.map((x:any)=>`${x.path.join('.')}: ${x.message}`).join(' · ');if(message.includes('UNIQUE constraint'))message='Ese SKU o referencia ya existe, incluso entre los registros ocultos. Edita o restaura el registro existente.';if(message.includes('FOREIGN KEY'))message='Selecciona referencias válidas antes de guardar.';console.error('[catalog-api]',e.name);return json({error:message},e instanceof AuthError?e.status:400);}
};
export const GET:APIRoute=async({params})=>{if(params.action!=='export')return json({error:'No encontrado.'},404);const tables=['category','commercial_unit','presentation','measure_unit','product','product_private','measure','technical_sheet','facet','product_facet','country','region','city','sector','project','project_product','media','product_image','project_image','site_settings','slide','service','audit'];return new Response(JSON.stringify({version:1,exported_at:new Date().toISOString(),tables:Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await all(`SELECT * FROM ${t}`))])))},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="gestion-esencial-datos.json"','Cache-Control':'no-store'}});};


