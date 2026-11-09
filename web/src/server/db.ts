import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requestActor } from './request-context.ts';
export const dataDir = resolve(process.env.GE_DATA_DIR || '.local');
mkdirSync(dataDir, {recursive:true});
const db = new DatabaseSync(resolve(dataDir,'catalog.sqlite'));
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(readFileSync(resolve('migrations/001_initial.sql'),'utf8'));
db.exec('CREATE TABLE IF NOT EXISTS schema_migration(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
if(!db.prepare('SELECT 1 FROM schema_migration WHERE name=?').get('002_custom_slides')){
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(readFileSync(resolve('migrations/002_custom_slides.sql'),'utf8'));db.prepare('INSERT INTO schema_migration VALUES(?,?)').run('002_custom_slides',new Date().toISOString());db.exec('COMMIT');}
 catch(error){db.exec('ROLLBACK');throw error;}
}
export function all(sql:string,...args:any[]):any[] { return db.prepare(sql).all(...args); }
export function one(sql:string,...args:any[]):any { return db.prepare(sql).get(...args); }
export function run(sql:string,...args:any[]) { return db.prepare(sql).run(...args); }
export function transaction<T>(fn:()=>T):T { db.exec('BEGIN IMMEDIATE'); try {const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;} }
export function audit(action:string, detail:string, productId:string|null=null, projectId:string|null=null){run('INSERT INTO audit(id,product_id,project_id,action,detail,created_at,actor_user_id) VALUES(?,?,?,?,?,?,?)',randomUUID(),productId,projectId,action,detail,new Date().toISOString(),requestActor.getStore()||null);}
export function settings(){return one('SELECT * FROM site_settings WHERE id=1');}
export function options(){return {categories:all('SELECT * FROM category'),presentations:all('SELECT p.*,c.name AS unit_name FROM presentation p JOIN commercial_unit c ON c.code=p.commercial_unit'),units:all('SELECT * FROM measure_unit'),facets:all('SELECT * FROM facet ORDER BY type,name'),cities:all('SELECT * FROM city ORDER BY name'),sectors:all('SELECT * FROM sector')};}
export function images(kind:'product'|'project',id:string){return all(`SELECT m.id,m.original_name,m.width,m.height,i.alt,i.position FROM ${kind}_image i JOIN media m ON m.id=i.media_id WHERE i.${kind}_id=? AND i.deleted_at IS NULL ORDER BY i.position,m.id`,id);}
export function product(idOrSlug:string,admin=false){
 const p=one(`SELECT p.*,c.name AS category,pr.name AS presentation,u.name AS unit_name FROM product p JOIN category c ON c.id=p.category_id JOIN presentation pr ON pr.code=p.presentation_code JOIN commercial_unit u ON u.code=pr.commercial_unit WHERE (p.id=? OR p.slug=?) ${admin?'':"AND p.deleted_at IS NULL AND p.state='published'"}`,idOrSlug,idOrSlug);
 if(!p)return null;
 p.images=images('product',p.id);p.measures=all('SELECT m.*,u.name,u.symbol FROM measure m JOIN measure_unit u ON u.code=m.unit_code WHERE m.product_id=? AND m.deleted_at IS NULL',p.id);
 p.facets=all('SELECT f.* FROM product_facet pf JOIN facet f ON f.id=pf.facet_id WHERE pf.product_id=? AND pf.deleted_at IS NULL',p.id);
 p.sheet=one('SELECT * FROM technical_sheet WHERE product_id=?',p.id)||{};
 p.projects=all("SELECT pr.name FROM project pr JOIN project_product pp ON pp.project_id=pr.id WHERE pp.product_id=? AND pp.deleted_at IS NULL AND pr.state='published' AND pr.deleted_at IS NULL",p.id);
 if(admin)p.external_sku=one('SELECT external_sku FROM product_private WHERE product_id=?',p.id)?.external_sku||'';
 return p;
}
export function products(params:URLSearchParams=new URLSearchParams(),admin=false){
 const where:string[]=[];const args:any[]=[];
 if(!admin)where.push("p.deleted_at IS NULL AND p.state='published'");
 if(admin && params.get('view')==='hidden')where.push('p.deleted_at IS NOT NULL');
 else if(admin)where.push('p.deleted_at IS NULL');
 const q=(params.get('q')||'').slice(0,100).trim();
 if(q){where.push("(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')");const term='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term);}
 if(params.get('category')){where.push('c.code=?');args.push(params.get('category'));}
 for(const type of ['color','finish','use','area']) if(params.get(type)){where.push('EXISTS(SELECT 1 FROM product_facet pf JOIN facet f ON f.id=pf.facet_id WHERE pf.product_id=p.id AND pf.deleted_at IS NULL AND f.type=? AND f.id=?)');args.push(type,Number(params.get(type)));}
 if(params.get('presentation')){where.push('p.presentation_code=?');args.push(params.get('presentation'));}
 if(params.get('size')){where.push("EXISTS(SELECT 1 FROM technical_sheet ts WHERE ts.product_id=p.id AND ts.length_mm || 'x' || ts.width_mm=?)");args.push(params.get('size'));}
 // Price comparisons are only enabled for a selected category and presentation.
 const comparable=!!params.get('category')&&!!params.get('presentation');
 if(comparable && params.get('min')){const n=Number(params.get('min'));if(Number.isFinite(n)){where.push('p.price_cents>=?');args.push(Math.round(n*100));}}
 if(comparable && params.get('max')){const n=Number(params.get('max'));if(Number.isFinite(n)){where.push('p.price_cents<=?');args.push(Math.round(n*100));}}
 const sort=params.get('sort');const order=comparable&&sort==='price-up'?'p.price_cents ASC':comparable&&sort==='price-down'?'p.price_cents DESC':sort==='name'?'p.name ASC':'p.featured DESC,p.created_at DESC,p.name ASC';
 return all(`SELECT p.*,c.name AS category,c.code AS category_code,pr.name AS presentation,u.name AS unit_name,(SELECT media_id FROM product_image WHERE product_id=p.id AND deleted_at IS NULL ORDER BY position LIMIT 1) AS cover FROM product p JOIN category c ON c.id=p.category_id JOIN presentation pr ON pr.code=p.presentation_code JOIN commercial_unit u ON u.code=pr.commercial_unit ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY ${order}`, ...args);
}
export function projects(admin=false,hidden=false){return all(`SELECT pr.*,c.name AS city,s.name AS sector,(SELECT media_id FROM project_image WHERE project_id=pr.id AND deleted_at IS NULL ORDER BY position LIMIT 1) AS cover FROM project pr JOIN city c ON c.id=pr.city_id JOIN sector s ON s.id=pr.sector_id WHERE ${admin?(hidden?'pr.deleted_at IS NOT NULL':'pr.deleted_at IS NULL'):"pr.deleted_at IS NULL AND pr.state='published'"} ORDER BY pr.featured DESC,pr.name`);}
export function project(idOrSlug:string,admin=false){const p=one(`SELECT pr.*,c.name AS city,s.name AS sector FROM project pr JOIN city c ON c.id=pr.city_id JOIN sector s ON s.id=pr.sector_id WHERE (pr.id=? OR pr.slug=?) ${admin?'':"AND pr.deleted_at IS NULL AND pr.state='published'"}`,idOrSlug,idOrSlug);if(!p)return null;p.images=images('project',p.id);p.product_ids=all('SELECT product_id FROM project_product WHERE project_id=? AND deleted_at IS NULL ORDER BY position',p.id).map(x=>x.product_id);p.products=p.product_ids.map((id:string)=>product(id,admin)).filter(Boolean);return p;}
export function mediaVisible(id:string){return !!one(`SELECT 1 WHERE EXISTS(SELECT 1 FROM product_image i JOIN product p ON p.id=i.product_id WHERE i.media_id=? AND i.deleted_at IS NULL AND p.deleted_at IS NULL AND p.state='published') OR EXISTS(SELECT 1 FROM project_image i JOIN project pr ON pr.id=i.project_id WHERE i.media_id=? AND i.deleted_at IS NULL AND pr.deleted_at IS NULL AND pr.state='published') OR EXISTS(SELECT 1 FROM slide WHERE media_id=? AND active=1 AND deleted_at IS NULL) OR EXISTS(SELECT 1 FROM site_settings WHERE about_media_id=?)`,id,id,id,id);}

function seed(){
 if(one('SELECT id FROM site_settings WHERE id=1'))return;
 const assets=resolve(dataDir,'seed-assets');if(!existsSync(assets)||!readdirSync(assets).some(f=>f.endsWith('.webp')))return;
 transaction(()=>{
  [['pisos','Pisos'],['porcelanatos','Porcelanatos'],['ceramicas','Cerámicas'],['zocalos','Zócalos y perfiles'],['adhesivos','Pegantes y cementos']].forEach((r,i)=>run('INSERT INTO category VALUES(?,?,?)',i+1,...r));
  run("INSERT INTO commercial_unit VALUES('CAJA','caja'),('UNIDAD','unidad')");
  run("INSERT INTO presentation VALUES('CAJA','Caja','CAJA'),('PIEZA','Pieza','UNIDAD'),('SACO','Saco','UNIDAD'),('BOLSA','Bolsa','UNIDAD')");
  run("INSERT INTO measure_unit VALUES('M2','Cobertura','m²','area'),('KG','Peso neto','kg','masa'),('ML','Longitud','m lineal','longitud'),('PIEZA','Piezas','piezas','conteo')");
  run("INSERT INTO country VALUES('CO','Colombia')");run("INSERT INTO region VALUES(1,'Antioquia','CO'),(2,'Bogotá D.C.','CO'),(3,'Cundinamarca','CO')");
  run("INSERT INTO city VALUES(1,'Medellín',1),(2,'Bogotá',2),(3,'Rionegro',1),(4,'Chía',3)");run("INSERT INTO sector VALUES(1,'Residencial'),(2,'Comercial'),(3,'Corporativo'),(4,'Institucional')");
  [['color','Beige'],['color','Blanco'],['color','Gris'],['color','Madera'],['color','Negro'],['finish','Mate'],['finish','Satinado'],['finish','Brillante'],['finish','Antideslizante'],['use','Residencial'],['use','Comercial'],['area','Interior'],['area','Exterior']].forEach((r,i)=>run('INSERT INTO facet VALUES(?,?,?)',i+1,...r));
  const files=readdirSync(assets).filter(f=>f.endsWith('.webp'));const mediaIds:Record<string,string>={};const now=new Date().toISOString();
  for(const f of files){const id=randomUUID();mediaIds[f]=id;run('INSERT INTO media(id,storage_key,original_name,created_at) VALUES(?,?,?,?)',id,'seed-assets/'+f,f,now);}
  const pick=(prefix:string,index=0)=>mediaIds[files.filter(f=>f.startsWith(prefix))[index]||files.find(f=>f.startsWith(prefix))||files[0]];
  const demo=[
   ['GE-001','Aquatech LVT Lucca',1,295814,'CAJA',2.24,4,6],
   ['GE-002','Porcelanato Social White',2,188000,'CAJA',1.44,2,7],
   ['GE-003','Cerámica Vermont White',3,120000,'CAJA',1.60,2,6],
   ['GE-004','Cerámica Slate Black',3,99000,'CAJA',1.60,5,6],
   ['GE-005','Porcelanato Arena Natural',2,174000,'CAJA',1.44,1,6],
   ['GE-006','Piso Roble Mediterráneo',1,248000,'CAJA',2.20,4,7],
   ['GE-007','Porcelanato Piedra Gris',2,196000,'CAJA',1.44,3,9],
   ['GE-008','Piso Nórdico Beige',1,224000,'CAJA',2.24,1,6],
   ['GE-009','Zócalo Roble Natural',4,24000,'PIEZA',2.4,4,6],
   ['GE-010','Pegante para porcelanato',5,42000,'SACO',25,3,6],
  ];
  const ids:string[]=[];
  demo.forEach((r,i)=>{const id=randomUUID();ids.push(id);run('INSERT INTO product(id,sku,slug,name,description,category_id,presentation_code,price_cents,state,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,r[0],String(r[1]).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-'),r[1],i<8?'Una superficie que aporta carácter y continuidad a tus espacios. Explora su textura y encuentra con nuestro equipo la solución adecuada para tu proyecto. La información de esta referencia es demostrativa y debe validarse con la ficha del fabricante.':'El complemento para un acabado cuidado. Consulta con nuestro equipo la compatibilidad y presentación adecuadas para tu proyecto. Información demostrativa.',r[2],r[4],Number(r[3])*100,'published',i<4?1:0,now,now);
   run('INSERT INTO product_private VALUES(?,?)',id,'PROVEEDOR-DEMO-'+(i+1));run('INSERT INTO measure(product_id,unit_code,amount) VALUES(?,?,?)',id,i<8?'M2':i===8?'ML':'KG',Math.round(Number(r[5])*10000));if(i<8)run('INSERT INTO measure(product_id,unit_code,amount) VALUES(?,?,?)',id,'PIEZA',40000);
   run('INSERT INTO technical_sheet VALUES(?,?,?,?,?,?,?)',id,i<8?'600':'',i<8?'600':'',i<8?'8.5':'','Por confirmar con el fabricante','Consulta las recomendaciones de instalación, limpieza y mantenimiento con nuestro equipo.','Texturas y tonalidades para acompañar el diseño de tu espacio.');
   [r[6],r[7],10,12].forEach(f=>run('INSERT INTO product_facet(product_id,facet_id) VALUES(?,?)',id,f));
   run('INSERT INTO product_image VALUES(?,?,?,?,NULL)',id,pick('product-',i%8),0,String(r[1]));
   run('INSERT OR IGNORE INTO product_image VALUES(?,?,?,?,NULL)',id,pick('project-',i%3),1,'Ambiente de referencia');
  });
  [['Torre El Poblado',1,2],['Residencia Nova',1,1],['Casa Entre Árboles',3,1],['Espacio Origen',2,3]].forEach((r,i)=>{const id=randomUUID();run('INSERT INTO project(id,sku,slug,name,description,city_id,sector_id,state,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,'GE-PR00'+(i+1),['torre-el-poblado','residencia-nova','casa-entre-arboles','espacio-origen'][i],r[0],'Un ambiente que explora la relación entre la luz, las texturas y los materiales. Este proyecto es una referencia visual para revisar el sitio; no representa una obra acreditada de la empresa.',r[1],r[2],'published',1,now,now);run('INSERT INTO project_image VALUES(?,?,?,?,NULL)',id,pick('project-',i%4),0,String(r[0]));run('INSERT OR IGNORE INTO project_image VALUES(?,?,?,?,NULL)',id,pick('project-',(i+1)%4),1,'Detalle del ambiente');[ids[i],ids[(i+2)%8]].forEach((pid,n)=>run('INSERT INTO project_product VALUES(?,?,?,NULL)',id,pid,n));});
  run('INSERT INTO site_settings(id,about_title,about_text,about_media_id) VALUES(1,?,?,?)','Superficies que dan vida a tus espacios.','En Gestión Esencial acompañamos la elección de pisos y superficies desde la asesoría hasta la instalación. Creemos en el valor del detalle y en materiales que dialogan con cada espacio. Trabajamos contigo para encontrar una solución coherente con las necesidades de tu proyecto.',pick('about'));
  const slides=[['Espacios que se construyen desde el detalle.','INSTALACIÓN DE PISOS','Asesoría, materiales e instalación para proyectos que buscan calidad, precisión y acabados excepcionales.','Conoce nuestros productos','/catalogo'],['Materiales que transforman tu forma de habitar.','NUESTRO CATÁLOGO','Texturas y superficies para dar forma a cada idea. Encuentra el punto de partida de tu próximo proyecto.','Explorar el catálogo','/catalogo'],['Cada proyecto, una nueva posibilidad.','ESPACIOS CON CARÁCTER','Inspírate en los ambientes y descubre los materiales que hacen parte de cada espacio.','Descubrir proyectos','/proyectos']];
  slides.forEach((r,i)=>run('INSERT INTO slide(id,title,subtitle,description,button_text,button_href,media_id,position,active) VALUES(?,?,?,?,?,?,?,?,1)',i+1,...r,pick(i===0?'hero':'project-',i),i));
  [['Asesoramos.','Te acompañamos a elegir materiales que respondan a tu espacio y a tu proyecto.'],['Distribuimos.','Pisos y complementos en una selección pensada para diferentes necesidades.'],['Instalamos.','Cuidamos la preparación y cada detalle para que el resultado haga la diferencia.']].forEach((r,i)=>run('INSERT INTO service VALUES(?,?,?,?)',i+1,...r,i));
 });
}
if(!one('SELECT 1 FROM schema_migration WHERE name=?','003_accounts')){
 transaction(()=>{db.exec(readFileSync(resolve('migrations/003_accounts.sql'),'utf8'));run('INSERT INTO schema_migration VALUES(?,?)','003_accounts',new Date().toISOString());});
}
seed();
export default db;


