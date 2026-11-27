import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {decimalScaled,equivalent,slugify,parseDiscountPrice,productPricing} from '../src/domain/pricing.ts';

process.env.GE_DATA_DIR=mkdtempSync(join(tmpdir(),'gestion-esencial-test-'));
const {run,one,product,products,project,mediaVisible}=await import('../src/server/db.ts');
const {default:db}=await import('../src/server/db.local.ts');
const {saveProduct,saveProject,changeState}=await import('../src/server/mutations.ts');
(await run("INSERT INTO category(id,code,name,group_code) VALUES(1,'pisos','Otros pisos','pisos')"));
(await run("INSERT INTO commercial_unit VALUES('CAJA','caja'),('UNIDAD','unidad')"));
(await run("INSERT INTO presentation VALUES('CAJA','Caja','CAJA'),('SACO','Saco','UNIDAD')"));
(await run("INSERT INTO measure_unit VALUES('M2','Cobertura','m²','area'),('KG','Peso','kg','masa'),('PIEZA','Piezas','piezas','conteo')"));
(await run("INSERT INTO country VALUES('CO','Colombia')"));(await run("INSERT INTO region VALUES(1,'Antioquia','CO')"));(await run("INSERT INTO city(id,name,region_id) VALUES(1,'Medellín',1)"));(await run("INSERT INTO sector VALUES(1,'Residencial')"));
const im=randomUUID();(await run('INSERT INTO media(id,storage_key,original_name,created_at) VALUES(?,?,?,?)',im,'test.webp','test.webp',new Date().toISOString()));
const base={sku:'PRUEBA-001',name:'Piso de prueba',description:'Prueba aislada',state:'published',featured:false,images:[{id:im,alt:'Muestra'}],category_id:1,presentation_code:'CAJA',price:'100000',external_sku:'SECRETO-EXTERNO',measures:[{code:'M2',value:'2.24'}],facets:[],sheet:{length_mm:'600',width_mm:'600',thickness_mm:'8.5',warranty:'',recommendations:'',advantages:''}};

test('precios exactos y rechazo de cantidades inválidas',()=>{
 assert.equal(decimalScaled('295814',100),29581400);assert.equal(decimalScaled('2,24',10000),22400);
 assert.equal(equivalent(29581400,22400),13205982);assert.equal(equivalent(4200000,250000),168000);
 assert.equal(equivalent(100,0),null);assert.throws(()=>decimalScaled('-1',100));assert.throws(()=>decimalScaled('1.234',100));assert.throws(()=>decimalScaled('Infinity',100));
 assert.equal(slugify('Piso Mármol Claro'),'piso-marmol-claro');
});
test('publicación, privacidad, relación, ocultamiento y restauración sin borrar',async ()=>{
 const result=(await saveProduct(base));const p=(await product(result.id));
 assert.equal(p.price_cents,10000000);assert.equal(p.external_sku,undefined);assert.ok(!JSON.stringify((await products())).includes('SECRETO-EXTERNO'));
 assert.equal((await product(result.id,true)).external_sku,'SECRETO-EXTERNO');assert.equal((await mediaVisible(im)),true);
 await assert.rejects(async ()=>(await saveProject({sku:'PROY-001',name:'Proyecto de prueba',description:'',state:'published',featured:false,images:[],city_id:1,sector_id:1,product_ids:[result.id]})),/imagen/);
});
test('relaciones y restauración conservan datos y vuelven a borrador',async ()=>{
 const p=(await one("SELECT * FROM product WHERE sku='PRUEBA-001'"));
 const projectImage=randomUUID();(await run('INSERT INTO media(id,storage_key,original_name,created_at) VALUES(?,?,?,?)',projectImage,'project.webp','project.webp',new Date().toISOString()));
 const proj=(await saveProject({sku:'PROY-001',name:'Proyecto de prueba',description:'',state:'published',featured:false,images:[{id:projectImage,alt:'Proyecto'}],city_id:1,sector_id:1,product_ids:[p.id]}));
 assert.equal((await project(proj.id)).products.length,1);assert.equal((await product(p.id)).projects[0].name,'Proyecto de prueba');
 (await changeState({kind:'product',id:p.id,action:'hide'}));assert.equal((await product(p.id)),null);assert.equal((await project(proj.id)).products.length,0);assert.equal((await mediaVisible(im)),false);
 assert.equal((await one('SELECT count(*) AS n FROM product_image WHERE product_id=?',p.id)).n,1);assert.equal((await one('SELECT count(*) AS n FROM project_product WHERE product_id=?',p.id)).n,1);
 await assert.rejects(async ()=>(await saveProduct({...base,sku:'prueba-001'})),/UNIQUE/);
 (await changeState({kind:'product',id:p.id,action:'restore'}));assert.equal((await product(p.id)),null);const restored=(await product(p.id,true));assert.equal(restored.state,'draft');assert.equal(restored.external_sku,'SECRETO-EXTERNO');
 (await saveProduct({...base,id:p.id,revision:restored.revision}));assert.equal((await project(proj.id)).products.length,1);
 await assert.rejects(async ()=>(await saveProduct({...base,id:p.id,revision:restored.revision})),/otra pestaña/);
 (await changeState({kind:'project',id:proj.id,action:'hide'}));assert.equal((await project(proj.id)),null);assert.equal((await mediaVisible(projectImage)),false);assert.equal((await product(p.id)).projects.length,0);
});
test('validación y transacciones no dejan publicaciones incompletas',async ()=>{
 await assert.rejects(async ()=>(await saveProduct({...base,sku:'INVALID-1',measures:[]})),/m²/);
 await assert.rejects(async ()=>(await saveProduct({...base,sku:'INVALID-2',images:[]})),/imagen/);
 await assert.rejects(async ()=>(await saveProduct({...base,sku:'INVALID-3',price:'0'})));
 await assert.rejects(async ()=>(await saveProduct({...base,sku:'INVALID-4',facets:[999]})),/FOREIGN KEY/);
 assert.equal((await one("SELECT count(*) AS n FROM product WHERE sku LIKE 'INVALID-%'")).n,0);
 assert.equal((await products(new URLSearchParams({q:'%'}))).length,0);
 assert.equal((await products(new URLSearchParams({q:'prueba-001'}))).length,1);
});
test.after(()=>db.close());


test('descuentos, filtros, ordenamiento y actualización atómica del precio', async () => {
 const created = (await saveProduct({...base, sku:'OFERTA-001', discount_price:'80000'}));
 let offer = (await product(created.id, true));
 assert.equal(offer.price_cents, 10000000);
 assert.equal(offer.discount_price_cents, 8000000);
 assert.equal(productPricing(offer).final, 8000000);
 assert.equal(productPricing(offer).discountLabel, '20');
 assert.equal(parseDiscountPrice('0,00'), 0);
 assert.equal(parseDiscountPrice(''), 0);
 assert.equal(productPricing({price_cents:10000}).hasDiscount, false);
 assert.equal(productPricing({price_cents:10000,discount_price_cents:6667}).discountLabel, '33,33');
 const onlyOffers = new URLSearchParams({discount:'1'});
 assert.ok((await products(onlyOffers)).some(row => row.id === created.id));
 const priceFilter = new URLSearchParams({category:'pisos',presentation:'CAJA',min:'75000',max:'85000'});
 assert.ok((await products(priceFilter)).some(row => row.id === created.id));
 const competitor = (await saveProduct({...base,sku:'OFERTA-002',price:'90000'}));
 const sorted = (await products(new URLSearchParams({category:'pisos',presentation:'CAJA',sort:'price-up'})));
 assert.ok(sorted.findIndex(row => row.id === created.id) < sorted.findIndex(row => row.id === competitor.id));
 for (const invalid of ['100000','100001','-1','abc']) {
  await assert.rejects(async () => (await saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,discount_price:invalid})));
 }
 assert.equal((await product(offer.id,true)).discount_price_cents,8000000);
 (await saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,name:'Oferta actualizada'}));
 offer = (await product(offer.id,true));
 assert.equal(offer.discount_price_cents,8000000,'El cliente anterior conserva un descuento si omite el campo');
 (await saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,price:'70000',discount_price:'0'}));
 offer = (await product(offer.id,true));
 assert.equal(offer.price_cents,7000000);
 assert.equal(offer.discount_price_cents,0);
 assert.ok(!(await products(onlyOffers)).some(row => row.id === offer.id));
 await assert.rejects(async () => (await run('UPDATE product SET discount_price_cents=price_cents WHERE id=?',offer.id)));
});
