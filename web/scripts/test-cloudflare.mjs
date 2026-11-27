import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

const release=resolve(process.argv[2]||'');
const manifest=JSON.parse(readFileSync(join(release,'manifest.json'),'utf8'));
const config='dist-cloudflare/server/wrangler.json';
const wrangler='node_modules/wrangler/bin/wrangler.js';
const state=mkdtempSync(join(tmpdir(),'ge-workerd-test-'));
const local=['--local','--persist-to',state];
function command(args){
  const result=spawnSync(process.execPath,[wrangler,...args],{encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true});
  if(result.status!==0)throw new Error('Falló Wrangler: '+args.slice(0,3).join(' ')+'\n'+(result.stderr||result.stdout||result.error));
}
for(const file of ['migrations-cloudflare/0001_initial.sql',join(release,'catalog.sql')]){
  command(['d1','execute','DB','--config','wrangler.jsonc',...local,'--file',file]);
}
const variant=manifest.objects.find(object=>object.key.endsWith('-480.webp'));
if(variant)command(['r2','object','put','gestion-esencial-media/'+variant.key,'--config','wrangler.jsonc',...local,
  '--file',join(release,'media',variant.key),'--content-type',variant.contentType]);

const origin='http://127.0.0.1:18787';
const {vars:{GE_OWNER_EMAIL:email}}=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
assert.ok(email,'El correo del propietario debe estar definido en wrangler.jsonc');
const password='Una contraseña aislada para emulación';
const setupToken=randomBytes(24).toString('hex');
const server=spawn(process.execPath,[wrangler,'dev','--config',config,'--port','18787','--ip','127.0.0.1',...local,
  '--var','PUBLIC_ORIGIN:'+origin,'--var','GE_SETUP_TOKEN:'+setupToken,'--var','ALLOW_INDEXING:1'],
  {windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk);
let cookie='';
function post(route,data){
  return fetch(origin+'/admin/api/'+route,{method:'POST',redirect:'manual',headers:{Origin:origin,Cookie:cookie,
    'x-ge-admin':'1','Content-Type':'application/json'},body:JSON.stringify(data)});
}
try{
  let home;
  for(let attempt=0;attempt<100&&!home;attempt++){
    try{home=await fetch(origin+'/');}catch{await new Promise(resolve=>setTimeout(resolve,150));}
  }
  assert.equal(home?.status,200,'portada de Workers');
  assert.equal(home.headers.get('x-robots-tag'),null);
  assert.ok(!(await home.text()).includes('Vista local'),'producción no muestra la barra de pruebas');
  assert.ok((await(await fetch(origin+'/robots.txt')).text()).includes('Sitemap: '+origin+'/sitemap.xml'));
  assert.ok((await(await fetch(origin+'/sitemap.xml')).text()).includes(`<loc>${origin}/catalogo</loc>`));
  assert.equal((await fetch(origin+'/catalogo')).status,200);
  assert.equal((await fetch(origin+'/admin/api/export')).status,401);
  assert.equal((await fetch(origin+'/admin/correo-local')).status,404);
  assert.equal((await post('auth/setup',{email,password,confirmation:password})).status,403);
  assert.equal((await post('auth/setup',{email:'unauthorized@example.test',password,confirmation:password,setupToken})).status,403);
  const owner=await post('auth/setup',{email,password,confirmation:password,setupToken});
  assert.equal(owner.status,200,await owner.clone().text());
  assert.match(owner.headers.get('set-cookie'),/^__Host-ge_account_session=.*;.*Secure/i);
  cookie=owner.headers.get('set-cookie').split(';')[0];
  assert.ok((await(await fetch(origin+'/admin',{headers:{Cookie:cookie}})).text()).includes(email));
  const edited=await Promise.all(['Una rama de ensayo','Otra rama de ensayo'].map(name=>post('category',{action:'create',name,parent_id:null,position:2})));
  assert.ok(edited.every(response=>response.ok),await Promise.all(edited.map(r=>r.clone().text())));
  const exportData=await(await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();
  assert.equal(exportData.tables.product.length,manifest.products);
  assert.equal(exportData.tables.category.filter(row=>row.name.endsWith('rama de ensayo')).length,2);
  if(variant){
    const id=variant.key.split('/')[1].slice(0,-9);
    const photo=await fetch(`${origin}/media/${id}/480`,{headers:{Cookie:cookie}});
    assert.equal(photo.status,200);
    assert.equal(photo.headers.get('content-type'),'image/webp');
  }
  const bytes=await sharp({create:{width:50,height:50,channels:3,background:'#1f4f78'}}).png().toBuffer();
  const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'smoke.png');
  const upload=await fetch(origin+'/admin/api/upload',{method:'POST',headers:{Origin:origin,Cookie:cookie,'x-ge-admin':'1'},body:form});
  assert.equal(upload.status,200,await upload.clone().text());
  const photo=await upload.json();
  assert.equal((await fetch(origin+photo.url)).status,404);
  assert.equal((await fetch(origin+photo.url,{headers:{Cookie:cookie}})).status,200);
  const draft={sku:'GE-WORKER-SMOKE',name:'Piso de prueba del Worker',description:'Prueba aislada',state:'published',
    images:[{id:photo.id,alt:'Imagen de prueba'}],category_id:exportData.tables.category[0].id,is_floor:true,
    presentation_code:'CAJA',price:'90000',measures:[{code:'M2',value:'2'}]};
  const created=await post('product',draft);
  assert.equal(created.status,200,await created.clone().text());
  const product=await created.json();
  const detail=await(await fetch(origin+'/catalogo/'+product.slug)).text();
  assert.ok(detail.includes('data-floor-calculator'));
  assert.ok(detail.includes('<link rel="canonical" href="'+origin+'/catalogo/'+product.slug+'"'));
  assert.match(detail,/"priceCurrency":"COP"/);
  assert.equal((await fetch(origin+'/catalogo/'+product.id,{redirect:'manual'})).status,301);
  assert.ok((await(await fetch(origin+'/sitemap.xml')).text()).includes('/catalogo/'+product.slug));
  assert.equal((await fetch(origin+photo.url)).status,200);
  const concurrent=await Promise.all(['95000','99000'].map(price=>post('product',{...draft,id:product.id,revision:1,price})));
  assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,400]);
  assert.equal((await post('state',{kind:'product',id:product.id,action:'hide'})).status,200);
  assert.equal((await fetch(origin+'/catalogo/'+product.slug)).status,404);
  assert.ok(!(await(await fetch(origin+'/sitemap.xml')).text()).includes('/catalogo/'+product.slug));
  assert.equal((await fetch(origin+photo.url)).status,404);
  assert.equal((await post('logout',{})).status,200);
  assert.equal((await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).status,401);
  assert.equal((await post('auth/login',{email,password})).status,200);
  console.log('Cloudflare local: D1, concurrencia, R2, Images, portada, roles y sesiones correctos.');
}catch(error){
  await new Promise(resolve=>setTimeout(resolve,100));
  console.error(logs.replaceAll(setupToken,'[redacted]').split('\n').filter(line=>!line.startsWith('│')).slice(-45).join('\n'));
  throw error;
}finally{server.kill();}
