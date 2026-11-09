import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { all,run,dataDir,audit } from '../../../server/db.ts';
import { revokeSession,cookieName,requireActor,AuthError } from '../../../server/auth.ts';
import {saveSlide,changeSlideState} from '../../../server/slides.ts';
import {saveProduct,saveProject,saveContent,changeState} from '../../../server/mutations.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
export const POST:APIRoute=async({params,request,cookies,locals})=>{
 try{
  const action=params.action;
  requireActor(locals.user);
  if(action==='logout'){revokeSession(cookies.get(cookieName)?.value);cookies.delete(cookieName,{path:'/'});return json({ok:true});}
  if(action==='upload'){
   if(Number(request.headers.get('content-length')||0)>11*1024*1024)return json({error:'La imagen supera 10 MB.'},400);
   const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024||!file.size)return json({error:'Selecciona una imagen de hasta 10 MB.'},400);
   const bytes=Buffer.from(await file.arrayBuffer());const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata();if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages||1)>1)throw new Error('Solo se permiten fotografías JPEG, PNG o WebP sin animación.');
   const id=randomUUID();const ext=meta.format==='jpeg'?'jpg':meta.format;await mkdir(resolve(dataDir,'uploads'),{recursive:true});await writeFile(resolve(dataDir,'uploads',id+'.'+ext),bytes,{flag:'wx'});requireActor(locals.user);
   run('INSERT INTO media(id,storage_key,original_name,mime,width,height,created_at) VALUES(?,?,?,?,?,?,?)',id,'uploads/'+id+'.'+ext,file.name.slice(0,200),'image/'+meta.format,meta.width||null,meta.height||null,new Date().toISOString());audit('imagen','Nueva imagen incorporada');return json({id,name:file.name,url:'/media/'+id+'/960'});
  }
  if(Number(request.headers.get('content-length')||0)>256000)return json({error:'Solicitud demasiado grande.'},413);
  const raw=await request.text();if(Buffer.byteLength(raw,'utf8')>256000)return json({error:'Solicitud demasiado grande.'},413);
  const input=JSON.parse(raw);requireActor(locals.user);
  if(action==='slide')return json(saveSlide(input));if(action==='slide-state')return json(changeSlideState(input));
  if(action==='product')return json(saveProduct(input));if(action==='project')return json(saveProject(input));if(action==='content')return json(saveContent(input));if(action==='state')return json(changeState(input));
  return json({error:'Acción desconocida.'},404);
 }catch(e:any){let message=e.message||'No se pudo guardar.';if(e.issues)message=e.issues.map((x:any)=>`${x.path.join('.')}: ${x.message}`).join(' · ');if(message.includes('UNIQUE constraint'))message='Ese SKU o referencia ya existe, incluso entre los registros ocultos. Edita o restaura el registro existente.';if(message.includes('FOREIGN KEY'))message='Selecciona referencias válidas antes de guardar.';console.error('[local-api]',e.name);return json({error:message},e instanceof AuthError?e.status:400);}
};
export const GET:APIRoute=async({params})=>{if(params.action!=='export')return json({error:'No encontrado.'},404);const tables=['category','commercial_unit','presentation','measure_unit','product','product_private','measure','technical_sheet','facet','product_facet','country','region','city','sector','project','project_product','media','product_image','project_image','site_settings','slide','service','audit'];return new Response(JSON.stringify({version:1,exported_at:new Date().toISOString(),tables:Object.fromEntries(tables.map(t=>[t,all(`SELECT * FROM ${t}`)]))},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="gestion-esencial-datos.json"','Cache-Control':'no-store'}});};


