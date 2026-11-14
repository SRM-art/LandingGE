import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {decimalScaled,equivalent,slugify,parseDiscountPrice,productPricing} from '../src/domain/pricing.ts';

process.env.GE_DATA_DIR=mkdtempSync(join(tmpdir(),'gestion-esencial-test-'));
const {default:db,run,one,product,products,project,mediaVisible}=await import('../src/server/db.ts');
const {saveProduct,saveProject,changeState}=await import('../src/server/mutations.ts');
run("INSERT INTO category VALUES(1,'pisos','Pisos')");
run("INSERT INTO commercial_unit VALUES('CAJA','caja'),('UNIDAD','unidad')");
run("INSERT INTO presentation VALUES('CAJA','Caja','CAJA'),('SACO','Saco','UNIDAD')");
run("INSERT INTO measure_unit VALUES('M2','Cobertura','m²','area'),('KG','Peso','kg','masa'),('PIEZA','Piezas','piezas','conteo')");
run("INSERT INTO country VALUES('CO','Colombia')");run("INSERT INTO region VALUES(1,'Antioquia','CO')");run("INSERT INTO city VALUES(1,'Medellín',1)");run("INSERT INTO sector VALUES(1,'Residencial')");
const im=randomUUID();run('INSERT INTO media(id,storage_key,original_name,created_at) VALUES(?,?,?,?)',im,'test.webp','test.webp',new Date().toISOString());
const base={sku:'PRUEBA-001',name:'Piso de prueba',description:'Prueba aislada',state:'published',featured:false,images:[{id:im,alt:'Muestra'}],category_id:1,presentation_code:'CAJA',price:'100000',external_sku:'SECRETO-EXTERNO',measures:[{code:'M2',value:'2.24'}],facets:[],sheet:{length_mm:'600',width_mm:'600',thickness_mm:'8.5',warranty:'',recommendations:'',advantages:''}};

test('precios exactos y rechazo de cantidades inválidas',()=>{
 assert.equal(decimalScaled('295814',100),29581400);assert.equal(decimalScaled('2,24',10000),22400);
 assert.equal(equivalent(29581400,22400),13205982);assert.equal(equivalent(4200000,250000),168000);
 assert.equal(equivalent(100,0),null);assert.throws(()=>decimalScaled('-1',100));assert.throws(()=>decimalScaled('1.234',100));assert.throws(()=>decimalScaled('Infinity',100));
 assert.equal(slugify('Piso Mármol Claro'),'piso-marmol-claro');
});
test('publicación, privacidad, relación, ocultamiento y restauración sin borrar',()=>{
 const result=saveProduct(base);const p=product(result.id);
 assert.equal(p.price_cents,10000000);assert.equal(p.external_sku,undefined);assert.ok(!JSON.stringify(products()).includes('SECRETO-EXTERNO'));
 assert.equal(product(result.id,true).external_sku,'SECRETO-EXTERNO');assert.equal(mediaVisible(im),true);
 assert.throws(()=>saveProject({sku:'PROY-001',name:'Proyecto de prueba',description:'',state:'published',featured:false,images:[],city_id:1,sector_id:1,product_ids:[result.id]}),/imagen/);
});
test('relaciones y restauración conservan datos y vuelven a borrador',()=>{
 const p=one("SELECT * FROM product WHERE sku='PRUEBA-001'");
 const projectImage=randomUUID();run('INSERT INTO media(id,storage_key,original_name,created_at) VALUES(?,?,?,?)',projectImage,'project.webp','project.webp',new Date().toISOString());
 const proj=saveProject({sku:'PROY-001',name:'Proyecto de prueba',description:'',state:'published',featured:false,images:[{id:projectImage,alt:'Proyecto'}],city_id:1,sector_id:1,product_ids:[p.id]});
 assert.equal(project(proj.id).products.length,1);assert.equal(product(p.id).projects[0].name,'Proyecto de prueba');
 changeState({kind:'product',id:p.id,action:'hide'});assert.equal(product(p.id),null);assert.equal(project(proj.id).products.length,0);assert.equal(mediaVisible(im),false);
 assert.equal(one('SELECT count(*) AS n FROM product_image WHERE product_id=?',p.id).n,1);assert.equal(one('SELECT count(*) AS n FROM project_product WHERE product_id=?',p.id).n,1);
 assert.throws(()=>saveProduct({...base,sku:'prueba-001'}),/UNIQUE/);
 changeState({kind:'product',id:p.id,action:'restore'});assert.equal(product(p.id),null);const restored=product(p.id,true);assert.equal(restored.state,'draft');assert.equal(restored.external_sku,'SECRETO-EXTERNO');
 saveProduct({...base,id:p.id,revision:restored.revision});assert.equal(project(proj.id).products.length,1);
 assert.throws(()=>saveProduct({...base,id:p.id,revision:restored.revision}),/otra pestaña/);
 changeState({kind:'project',id:proj.id,action:'hide'});assert.equal(project(proj.id),null);assert.equal(mediaVisible(projectImage),false);assert.equal(product(p.id).projects.length,0);
});
test('validación y transacciones no dejan publicaciones incompletas',()=>{
 assert.throws(()=>saveProduct({...base,sku:'INVALID-1',measures:[]}),/m²/);
 assert.throws(()=>saveProduct({...base,sku:'INVALID-2',images:[]}),/imagen/);
 assert.throws(()=>saveProduct({...base,sku:'INVALID-3',price:'0'}));
 assert.throws(()=>saveProduct({...base,sku:'INVALID-4',facets:[999]}),/FOREIGN KEY/);
 assert.equal(one("SELECT count(*) AS n FROM product WHERE sku LIKE 'INVALID-%'").n,0);
 assert.equal(products(new URLSearchParams({q:'%'})).length,0);
 assert.equal(products(new URLSearchParams({q:'prueba-001'})).length,1);
});
test.after(()=>db.close());


test('descuentos, filtros, ordenamiento y actualización atómica del precio', () => {
 const created = saveProduct({...base, sku:'OFERTA-001', discount_price:'80000'});
 let offer = product(created.id, true);
 assert.equal(offer.price_cents, 10000000);
 assert.equal(offer.discount_price_cents, 8000000);
 assert.equal(productPricing(offer).final, 8000000);
 assert.equal(productPricing(offer).discountLabel, '20');
 assert.equal(parseDiscountPrice('0,00'), 0);
 assert.equal(parseDiscountPrice(''), 0);
 assert.equal(productPricing({price_cents:10000}).hasDiscount, false);
 assert.equal(productPricing({price_cents:10000,discount_price_cents:6667}).discountLabel, '33,33');
 const onlyOffers = new URLSearchParams({discount:'1'});
 assert.ok(products(onlyOffers).some(row => row.id === created.id));
 const priceFilter = new URLSearchParams({category:'pisos',presentation:'CAJA',min:'75000',max:'85000'});
 assert.ok(products(priceFilter).some(row => row.id === created.id));
 const competitor = saveProduct({...base,sku:'OFERTA-002',price:'90000'});
 const sorted = products(new URLSearchParams({category:'pisos',presentation:'CAJA',sort:'price-up'}));
 assert.ok(sorted.findIndex(row => row.id === created.id) < sorted.findIndex(row => row.id === competitor.id));
 for (const invalid of ['100000','100001','-1','abc']) {
  assert.throws(() => saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,discount_price:invalid}));
 }
 assert.equal(product(offer.id,true).discount_price_cents,8000000);
 saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,name:'Oferta actualizada'});
 offer = product(offer.id,true);
 assert.equal(offer.discount_price_cents,8000000,'El cliente anterior conserva un descuento si omite el campo');
 saveProduct({...base,id:offer.id,revision:offer.revision,sku:offer.sku,price:'70000',discount_price:'0'});
 offer = product(offer.id,true);
 assert.equal(offer.price_cents,7000000);
 assert.equal(offer.discount_price_cents,0);
 assert.ok(!products(onlyOffers).some(row => row.id === offer.id));
 assert.throws(() => run('UPDATE product SET discount_price_cents=price_cents WHERE id=?',offer.id));
});
