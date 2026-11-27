import {carouselText} from './carousel-validation.ts';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { one, run, transaction, audit } from './db.ts';
import {adhesiveMaterials, environments, profileUses, tones, wallFinishes, wallSurfaces} from '../domain/product-attributes.ts';
import {isFloorByBox} from '../domain/floor-calculator.ts';
import { decimalScaled, slugify, parseDiscountPrice } from '../domain/pricing.ts';
const imageInput=z.object({id:z.uuid(),alt:z.string().max(200).default('')});
const base=z.object({id:z.uuid().optional(),revision:z.number().int().optional(),sku:z.string().trim().min(2).max(60),name:z.string().trim().min(3).max(140),description:z.string().max(6000).default(''),state:z.enum(['draft','published']),featured:z.boolean().default(false),images:z.array(imageInput).max(20)});
const productInput=base.extend({
 is_floor:z.boolean().optional(),
 wall_finish:z.enum(Object.keys(wallFinishes)).nullable().optional(),
 wall_surface:z.enum(Object.keys(wallSurfaces)).nullable().optional(),
 profile_use:z.enum(Object.keys(profileUses)).nullable().optional(),
 adhesive_materials:z.array(z.enum(Object.keys(adhesiveMaterials))).max(3).optional(),
 overlay:z.boolean().optional(),
 tone:z.enum(Object.keys(tones)).nullable().optional(),environment:z.enum(Object.keys(environments)).nullable().optional(),slip_resistant:z.boolean().optional(),category_id:z.number().int(),presentation_code:z.string().max(20),price:z.string().max(30),discount_price:z.string().max(30).optional(),external_sku:z.string().max(100).default(''),measures:z.array(z.object({code:z.enum(['M2','KG','ML','PIEZA']),value:z.string().max(30)})).max(4),facets:z.array(z.number().int()).max(30).optional(),sheet:z.object({length_mm:z.string().max(20),width_mm:z.string().max(20),thickness_mm:z.string().max(20),warranty:z.string().max(150),recommendations:z.string().max(3000),advantages:z.string().max(3000)}).optional()});
const projectInput=base.extend({city_id:z.number().int(),sector_id:z.number().int(),product_ids:z.array(z.uuid()).max(100)});
async function validateImages(images:z.infer<typeof imageInput>[]){if(new Set(images.map(i=>i.id)).size!==images.length)throw new Error('Una imagen no puede repetirse en la misma galería.');for(const i of images)if(!(await one('SELECT 1 FROM media WHERE id=?',i.id)))throw new Error('Una imagen ya no está disponible.');}
async function syncImages(kind:'product'|'project',id:string,images:z.infer<typeof imageInput>[],now:string){
 (await run(`UPDATE ${kind}_image SET deleted_at=? WHERE ${kind}_id=? AND deleted_at IS NULL`,now,id));
 for(const [i,im] of images.entries())(await run(`INSERT INTO ${kind}_image(${kind}_id,media_id,position,alt,deleted_at) VALUES(?,?,?,?,NULL) ON CONFLICT(${kind}_id,media_id) DO UPDATE SET position=excluded.position,alt=excluded.alt,deleted_at=NULL`,id,im.id,i,im.alt));
}
async function previous(kind:'product'|'project',data:any){if(!data.id)return null;const old=(await one(`SELECT * FROM ${kind} WHERE id=?`,data.id));if(!old)throw new Error('El registro no existe.');if(old.revision!==data.revision)throw new Error('Este registro cambió en otra pestaña. Recarga antes de guardar para conservar los cambios.');if(old.deleted_at && data.state==='published')throw new Error('Restaura el registro antes de publicarlo.');return old;}
export async function saveProduct(input:unknown){const d=productInput.parse(input);(await validateImages(d.images));const price=d.price.trim()?decimalScaled(d.price,100):null;if(price && price>1e12)throw new Error('El precio excede el rango permitido.');
 const measures=d.measures.filter(m=>m.value.trim()).map(m=>({code:m.code,amount:decimalScaled(m.value,10000)}));if(new Set(measures.map(m=>m.code)).size!==measures.length)throw new Error('Las medidas no pueden repetirse.');
 for(const m of measures){if(m.amount>1e12)throw new Error('Medida fuera de rango.');if(m.code==='PIEZA'&&m.amount%10000!==0)throw new Error('Las piezas deben ser unidades enteras.');}
 const sheet=d.sheet;
 if(sheet){
  for(const value of [sheet.length_mm,sheet.width_mm,sheet.thickness_mm]){
   if(value.trim())decimalScaled(value,10000);
  }
 }
 return (await transaction(async ()=>{const old=(await previous('product',d));const id=old?.id||randomUUID();const now=new Date().toISOString();
 const category=(await one('SELECT group_code FROM category WHERE id=? AND deleted_at IS NULL',d.category_id));
 if(!category||!(await one('SELECT 1 FROM presentation WHERE code=?',d.presentation_code)))throw new Error('Selecciona una clasificación activa y una presentación válida.');
 const isFloor=d.is_floor ?? (old ? Boolean(old.is_floor) : category.group_code==='pisos');
 if(d.state==='published'){
  if(!price)throw new Error('El producto necesita un precio final para publicarse.');
  if(!d.images.length)throw new Error('Añade al menos una imagen para publicar.');
  if(isFloorByBox({is_floor:isFloor,presentation_code:d.presentation_code})&&!measures.some(m=>m.code==='M2'))throw new Error('Los pisos por caja necesitan cobertura en m².');
 }
 const discountPrice = d.discount_price === undefined
   ? (old?.discount_price_cents ?? 0)
   : parseDiscountPrice(d.discount_price);
 if (discountPrice > 0 && (!price || discountPrice >= price)) {
   throw new Error('El precio con descuento debe ser menor que el precio normal y mayor que cero. Usa 0 para quitar el descuento.');
 }
 const slug=old?.slug||slugify(d.name)+'-'+slugify(d.sku);
 if(old)(await run('UPDATE product SET sku=?,name=?,description=?,category_id=?,presentation_code=?,price_cents=?,discount_price_cents=?,state=?,featured=?,revision=revision+1,updated_at=? WHERE id=?',d.sku,d.name,d.description,d.category_id,d.presentation_code,price,discountPrice,d.state,Number(d.featured),now,id));
 else (await run('INSERT INTO product(id,sku,slug,name,description,category_id,presentation_code,price_cents,discount_price_cents,state,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',id,d.sku,slug,d.name,d.description,d.category_id,d.presentation_code,price,discountPrice,d.state,Number(d.featured),now,now));
 const tone=d.tone===undefined ? old?.tone ?? null : d.tone;
 const environment=d.environment===undefined ? old?.environment ?? null : d.environment;
 const slipResistant=Number(d.slip_resistant ?? old?.slip_resistant ?? 0);
 const wallFinish=d.wall_finish===undefined ? old?.wall_finish ?? null : d.wall_finish;
 const wallSurface=d.wall_surface===undefined ? old?.wall_surface ?? null : d.wall_surface;
 const profileUse=d.profile_use===undefined ? old?.profile_use ?? null : d.profile_use;
 const materials=d.adhesive_materials===undefined ? old?.adhesive_materials ?? '[]' : JSON.stringify([...new Set(d.adhesive_materials)]);
 const overlay=Number(d.overlay ?? old?.overlay ?? 0);
 (await run(`UPDATE product SET tone=?,environment=?,slip_resistant=?,wall_finish=?,wall_surface=?,
      profile_use=?,adhesive_materials=?,overlay=?,is_floor=? WHERE id=?`,
     tone,environment,slipResistant,wallFinish,wallSurface,profileUse,materials,overlay,Number(isFloor),id));
 (await run('INSERT INTO product_private VALUES(?,?) ON CONFLICT(product_id) DO UPDATE SET external_sku=excluded.external_sku',id,d.external_sku||null));
 (await run('UPDATE measure SET deleted_at=? WHERE product_id=? AND deleted_at IS NULL',now,id));for(const m of measures)(await run('INSERT INTO measure(product_id,unit_code,amount,deleted_at) VALUES(?,?,?,NULL) ON CONFLICT(product_id,unit_code) DO UPDATE SET amount=excluded.amount,deleted_at=NULL',id,m.code,m.amount));
 if(sheet){
  (await run(`INSERT INTO technical_sheet VALUES(?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET
   length_mm=excluded.length_mm,width_mm=excluded.width_mm,thickness_mm=excluded.thickness_mm,
   warranty=excluded.warranty,recommendations=excluded.recommendations,advantages=excluded.advantages`,
   id,sheet.length_mm,sheet.width_mm,sheet.thickness_mm,sheet.warranty,sheet.recommendations,sheet.advantages));
 }
 if(d.facets){
 (await run('UPDATE product_facet SET deleted_at=? WHERE product_id=? AND deleted_at IS NULL',now,id));for(const f of new Set(d.facets))(await run('INSERT INTO product_facet VALUES(?,?,NULL) ON CONFLICT(product_id,facet_id) DO UPDATE SET deleted_at=NULL',id,f));
 }
 (await syncImages('product',id,d.images,now));(await audit(old?'actualizar':'crear',d.name,id));return {id,slug};}));
}
export async function saveProject(input:unknown){const d=projectInput.parse(input);(await validateImages(d.images));if(d.state==='published'&&!d.images.length)throw new Error('Añade una imagen para publicar el proyecto.');return (await transaction(async ()=>{const old=(await previous('project',d));const id=old?.id||randomUUID();const now=new Date().toISOString();
 const city=(await one('SELECT deleted_at FROM city WHERE id=?',d.city_id));
 if(!city || (city.deleted_at && old?.city_id!==d.city_id))throw new Error('Selecciona una ciudad disponible antes de guardar.');
 if(old)(await run('UPDATE project SET sku=?,name=?,description=?,city_id=?,sector_id=?,state=?,featured=?,revision=revision+1,updated_at=? WHERE id=?',d.sku,d.name,d.description,d.city_id,d.sector_id,d.state,Number(d.featured),now,id));
 else (await run('INSERT INTO project(id,sku,slug,name,description,city_id,sector_id,state,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,d.sku,slugify(d.name)+'-'+slugify(d.sku),d.name,d.description,d.city_id,d.sector_id,d.state,Number(d.featured),now,now));
 (await run('UPDATE project_product SET deleted_at=? WHERE project_id=? AND deleted_at IS NULL',now,id));for(const [i,pid] of [...new Set(d.product_ids)].entries())await run('INSERT INTO project_product VALUES(?,?,?,NULL) ON CONFLICT(project_id,product_id) DO UPDATE SET position=excluded.position,deleted_at=NULL',id,pid,i);(await syncImages('project',id,d.images,now));(await audit(old?'actualizar':'crear',d.name,null,id));return {id};}));}
export async function changeState(input:unknown){const d=z.object({kind:z.enum(['product','project']),id:z.uuid(),action:z.enum(['hide','restore'])}).parse(input);return (await transaction(async ()=>{const old=(await one(`SELECT * FROM ${d.kind} WHERE id=?`,d.id));if(!old)throw new Error('Registro no encontrado.');(await run(`UPDATE ${d.kind} SET deleted_at=?,state=?,revision=revision+1,updated_at=? WHERE id=?`,d.action==='hide'?new Date().toISOString():null,d.action==='restore'?'draft':old.state,new Date().toISOString(),d.id));(await audit(d.action==='hide'?'ocultar':'restaurar',old.name,d.kind==='product'?d.id:null,d.kind==='project'?d.id:null));return {ok:true};}));}
export async function saveContent(input:unknown){const schema=z.object({revision:z.number().int(),whatsapp:z.string().regex(/^$|^[1-9][0-9]{7,14}$/,'Usa código de país y número, solo dígitos (ej. 573001234567).'),phone:z.string().max(50),email:z.union([z.literal(''),z.email()]),address:z.string().max(250),hours:z.string().max(150),about_title:z.string().min(3).max(200),about_text:z.string().max(6000),about_media_id:z.uuid().nullable(),slides:z.array(z.object({id:z.number().int(),title:carouselText('title',3),subtitle:carouselText('subtitle'),description:carouselText('description'),button_text:carouselText('button_text',2),button_href:z.enum(['/catalogo','/proyectos','/#servicios','/#contacto']),media_id:z.uuid(),active:z.boolean()})).length(3),services:z.array(z.object({id:z.number().int(),title:z.string().min(2).max(80),description:z.string().max(500)})).length(3)});const d=schema.parse(input);if(new Set(d.slides.map(s=>s.id)).size!==3||d.slides.some(s=>![1,2,3].includes(s.id)))throw new Error('Las tres diapositivas base deben conservarse.');return (await transaction(async ()=>{const old=(await one('SELECT revision FROM site_settings WHERE id=1'));if(old.revision!==d.revision)throw new Error('El contenido cambió en otra pestaña. Recarga para continuar.');(await run('UPDATE site_settings SET whatsapp=?,phone=?,email=?,address=?,hours=?,about_title=?,about_text=?,about_media_id=?,revision=revision+1 WHERE id=1',d.whatsapp,d.phone,d.email,d.address,d.hours,d.about_title,d.about_text,d.about_media_id));for(const s of d.slides)(await run('UPDATE slide SET title=?,subtitle=?,description=?,button_text=?,button_href=?,media_id=?,active=? WHERE id=?',s.title,s.subtitle,s.description,s.button_text,s.button_href,s.media_id,Number(s.active),s.id));for(const s of d.services)(await run('UPDATE service SET title=?,description=? WHERE id=?',s.title,s.description,s.id));(await audit('contenido','Actualización de la landing y contacto'));return {ok:true};}));}




