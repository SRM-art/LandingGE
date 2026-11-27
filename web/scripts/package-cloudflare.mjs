import { mkdirSync, mkdtempSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

const dataDir = realpathSync(resolve(process.env.GE_DATA_DIR || '.local'));
const db = new DatabaseSync(resolve(dataDir,'catalog.sqlite'), {readOnly:true});
// Accounts, passwords, sessions, audit history and local mail are intentionally outside this export.
const tables = [
  'category','commercial_unit','presentation','measure_unit','facet','country','region','city','sector',
  'media','product','product_private','measure','technical_sheet','product_facet','product_image',
  'project','project_product','project_image','site_settings','slide','service',
];
const snapshot = {};
try {
  db.exec('BEGIN');
  for (const table of tables) {
    if (table === 'category') {
      snapshot.category = db.prepare(`WITH RECURSIVE ordered(id,depth) AS (
        SELECT id,0 FROM category WHERE parent_id IS NULL UNION ALL
        SELECT child.id,depth+1 FROM category child JOIN ordered ON child.parent_id=ordered.id
      ) SELECT category.* FROM ordered JOIN category USING(id) ORDER BY depth,id`).all();
    } else {
      snapshot[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
  }
} finally { db.close(); }

if (snapshot.site_settings.length !== 1 || [1,2,3].some(id=>!snapshot.slide.some(slide=>slide.id===id))) {
  throw new Error('Inicializa la versión local y confirma que la portada tiene las tres diapositivas base.');
}
const referenced = new Set([
  ...snapshot.product_image.map(row=>row.media_id), ...snapshot.project_image.map(row=>row.media_id),
  ...snapshot.slide.map(row=>row.media_id), ...snapshot.site_settings.map(row=>row.about_media_id),
].filter(Boolean));
snapshot.media = snapshot.media.filter(row=>referenced.has(row.id));
if (snapshot.media.length !== referenced.size) throw new Error('Faltan registros de imágenes en la base local.');

mkdirSync('.local/cloudflare-releases',{recursive:true});
const release = mkdtempSync(resolve('.local/cloudflare-releases','release-'));
const objects = [];
for(const media of snapshot.media){
  if (!/^[a-f0-9-]{36}$/i.test(media.id)) throw new Error('Identificador de imagen inválido.');
  const source = realpathSync(resolve(dataDir,media.storage_key));
  if(!source.startsWith(dataDir+sep)||!statSync(source).isFile()) throw new Error('Ruta de imagen inválida.');
  const format=(await sharp(source,{limitInputPixels:40_000_000}).metadata()).format;
  if(!format||!['jpeg','png','webp'].includes(format)) throw new Error('Formato de imagen inválido: '+media.id);
  media.storage_key=`originals/${media.id}.${format==='jpeg'?'jpg':format}`;
  media.mime='image/'+format;
  const original=resolve(release,'media',media.storage_key);
  await mkdir(dirname(original),{recursive:true});
  await copyFile(source,original);
  objects.push({key:media.storage_key,contentType:media.mime});
  for(const size of [480,960,1600]){
    const key=`variants/${media.id}-${size}.webp`;
    const target=resolve(release,'media',key);
    await mkdir(dirname(target),{recursive:true});
    await sharp(source,{limitInputPixels:40_000_000}).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:85}).toFile(target);
    objects.push({key,contentType:'image/webp'});
  }
}

const identifier = value => '"'+value.replaceAll('"','""')+'"';
function literal(value){
  if (value===null) return 'NULL';
  if (typeof value==='number' && Number.isFinite(value)) return String(value);
  if (typeof value==='string' && !value.includes('\0')) return "'"+value.replaceAll("'","''")+"'";
  throw new Error('Tipo de dato inesperado durante la exportación.');
}
const sql = tables.flatMap(table=>snapshot[table].map(row=>{
  const keys=Object.keys(row);
  return `INSERT INTO ${identifier(table)} (${keys.map(identifier).join(',')}) VALUES (${keys.map(key=>literal(row[key])).join(',')});`;
}));
writeFileSync(resolve(release,'catalog.sql'),sql.join('\n')+'\n');
writeFileSync(resolve(release,'manifest.json'),JSON.stringify({schema:1,products:snapshot.product.length,projects:snapshot.project.length,objects},null,2)+'\n');
console.log(`Paquete privado: ${release}\n${snapshot.product.length} productos · ${snapshot.project.length} proyectos · ${objects.length} archivos para R2`);
