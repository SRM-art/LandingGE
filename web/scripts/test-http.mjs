import assert from 'node:assert/strict';
import {mkdtempSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
const dir=mkdtempSync(join(tmpdir(),'gestion-esencial-http-'));
cpSync(resolve('demo-assets'),join(dir,'seed-assets'),{recursive:true});
const port=14321,origin='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['dist/server/entry.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),LOCAL_PREVIEW:'1',GE_DATA_DIR:dir},windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
let cookie='';let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
async function post(action,data,extra={}){return fetch(origin+'/admin/api/'+action,{method:'POST',headers:{Origin:origin,Cookie:cookie,'x-ge-admin':'1','Content-Type':'application/json',...extra},body:JSON.stringify(data),redirect:'manual'});}
try{
 let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(origin+'/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}check(ready,'Servidor de prueba disponible');
 for(const route of ['/','/catalogo','/catalogo?q=GE-001','/catalogo?category=pisos&presentation=CAJA&min=200000','/proyectos','/nosotros','/catalogo/aquatech-lvt-lucca','/proyectos/torre-el-poblado']){const r=await fetch(origin+route);check(r.ok,'Carga '+route);const html=await r.text();check(!html.includes('PROVEEDOR-DEMO'),'SKU externo ausente de '+route);}
 const floorPage=await(await fetch(origin+'/catalogo/aquatech-lvt-lucca')).text();
 check(floorPage.includes('data-floor-calculator'),'Simulador en piso por caja');
 check(floorPage.includes('data-coverage="22400"'),'Cobertura real del producto en simulador');
 for(const slug of ['porcelanato-social-white','ceramica-vermont-white','zocalo-roble-natural','pegante-para-porcelanato'])check(!(await(await fetch(origin+'/catalogo/'+slug)).text()).includes('data-floor-calculator'),'Simulador ausente de '+slug);
 check((await fetch(origin+'/admin/api/export')).status===401,'Exportación protegida');
 check((await fetch(origin+'/admin',{redirect:'manual'})).status===302,'Panel requiere sesión');
 const login=await post('auth/setup',{email:'owner@example.test',password:'Una frase segura para pruebas 1',confirmation:'Una frase segura para pruebas 1'});check(login.status===200,'Configuración local: '+login.status+' '+(await login.clone().text()).slice(0,200));cookie=login.headers.get('set-cookie').split(';')[0];
 check((await post('product',{}, {Origin:'https://example.invalid'})).status===403,'Rechaza origen ajeno');
 check((await post('product',{}, {'x-ge-admin':''})).status===403,'Rechaza solicitud sin encabezado del panel');
 const bytes=await sharp({create:{width:50,height:50,channels:3,background:'#1f4f78'}}).png().toBuffer();
 const upload=new FormData();upload.append('file',new Blob([bytes],{type:'image/png'}),'prueba.png');
 const up=await fetch(origin+'/admin/api/upload',{method:'POST',headers:{Origin:origin,Cookie:cookie,'x-ge-admin':'1'},body:upload});check(up.ok,'Subida de imagen');const image=await up.json();
 check((await fetch(origin+'/media/'+image.id+'/480')).status===404,'Imagen sin publicar no es pública');
 const payload={sku:'HTTP-001',name:'Referencia de prueba HTTP',description:'Solo base aislada',state:'published',featured:false,images:[{id:image.id,alt:'Muestra'}],category_id:1,presentation_code:'CAJA',price:'100000',external_sku:'SOLO-PRIVADO-HTTP',measures:[{code:'M2',value:'2'}],facets:[],sheet:{length_mm:'600',width_mm:'600',thickness_mm:'8',warranty:'',recommendations:'',advantages:''}};
 const saved=await post('product',payload);check(saved.ok,'Crear producto');const p=await saved.json();
 const page=await fetch(origin+'/catalogo/'+p.slug);check(page.ok,'Producto publicado');const html=await page.text();check(html.includes('50.000'),'Equivalente calculado');check(!html.includes('SOLO-PRIVADO-HTTP'),'SKU externo privado');
 check((await fetch(origin+'/media/'+image.id+'/480')).status===200,'Imagen publicada disponible');
 const project=await post('project',{sku:'HTTP-P001',name:'Proyecto de prueba HTTP',description:'',state:'published',featured:false,images:[{id:image.id,alt:'Ambiente'}],city_id:1,sector_id:1,product_ids:[p.id]});check(project.ok,'Crear proyecto relacionado');const pr=await project.json();
 let exp=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();let item=exp.tables.product.find(x=>x.id===p.id);let prItem=exp.tables.project.find(x=>x.id===pr.id);
 check((await (await fetch(origin+'/proyectos/'+prItem.slug)).text()).includes('/catalogo/'+p.slug),'Proyecto enlaza al producto');
 check((await post('product',{...payload,id:p.id,revision:item.revision,price:'110000'})).ok,'Actualizar producto');
 check((await post('product',{...payload,id:p.id,revision:item.revision})).status===400,'Conflicto de edición detectado');
 check((await post('state',{kind:'product',id:p.id,action:'hide'})).ok,'Ocultar producto');check((await fetch(origin+'/catalogo/'+p.slug)).status===404,'URL oculta devuelve 404');
 check(!(await (await fetch(origin+'/proyectos/'+prItem.slug)).text()).includes('/catalogo/'+p.slug),'Relación oculta no se publica');
 check((await fetch(origin+'/media/'+image.id+'/480')).status===200,'Imagen compartida mantiene uso público del proyecto');
 await post('state',{kind:'project',id:pr.id,action:'hide'});check((await fetch(origin+'/media/'+image.id+'/480')).status===404,'Sin usos públicos la imagen desaparece');
 await post('state',{kind:'product',id:p.id,action:'restore'});check((await fetch(origin+'/catalogo/'+p.slug)).status===404,'Restaurar vuelve a borrador');
 exp=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();item=exp.tables.product.find(x=>x.id===p.id);check(item.state==='draft'&&!item.deleted_at,'Restauración persistente');check(exp.tables.project_product.some(x=>x.product_id===p.id),'Relación conservada');check(exp.tables.product_image.some(x=>x.product_id===p.id),'Imagen conservada');
 const settings=exp.tables.site_settings[0];const content={...settings,about_title:'Título actualizado de prueba',slides:exp.tables.slide.map(s=>({...s,active:!!s.active})),services:exp.tables.service};check((await post('content',content)).ok,'Guardar contenidos');check((await (await fetch(origin+'/')).text()).includes('Título actualizado de prueba'),'Contenido aparece en portada');
 const newSlide={title:'Diapositiva adicional HTTP',subtitle:'NUEVOS MATERIALES',description:'Textos con diseño conservado',images:[{id:image.id,alt:''}],active:true,button_href:'https://example.invalid',button_text:'No permitido'};
 check((await post('slide',{...newSlide,images:[]})).status===400,'Slide requiere imagen');
 const slideResponse=await post('slide',newSlide);check(slideResponse.ok,'Crear diapositiva adicional');const newSlideId=(await slideResponse.json()).id;check(newSlideId>3,'Conserva los identificadores base');
 let slideData=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();let slide=slideData.tables.slide.find(x=>x.id===newSlideId);
 check(slide.button_href==='/catalogo'&&slide.button_text==='Explorar el catálogo','CTA al catálogo impuesto por servidor');
 check((await (await fetch(origin+'/')).text()).includes(newSlide.title),'Slide adicional aparece en portada');
 check((await fetch(origin+'/media/'+image.id+'/480')).status===200,'Imagen de slide publicado disponible');
 check((await fetch(origin+'/admin/slides/'+newSlideId,{headers:{Cookie:cookie}})).ok,'Formulario de edición de diapositiva');
 check((await post('slide',{...newSlide,id:newSlideId,revision:slide.revision,title:'Diapositiva modificada HTTP'})).ok,'Modificar diapositiva');
 check((await post('slide',{...newSlide,id:newSlideId,revision:slide.revision})).status===400,'Detecta conflicto de edición de diapositiva');
 check((await post('slide-state',{id:1,revision:1,action:'hide'})).status===400,'Impide quitar diapositiva base');
 check((await post('slide',{...newSlide,id:2,revision:1})).status===400,'Protege diapositivas base del editor adicional');
 slideData=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();slide=slideData.tables.slide.find(x=>x.id===newSlideId);
 check((await post('slide-state',{id:newSlideId,revision:slide.revision,action:'hide'})).ok,'Quitar diapositiva mediante borrado lógico');
 check(!(await (await fetch(origin+'/')).text()).includes('Diapositiva modificada HTTP'),'Slide oculto desaparece de portada');
 check((await fetch(origin+'/media/'+image.id+'/480')).status===404,'Imagen exclusiva de slide oculto queda privada');
 slideData=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();slide=slideData.tables.slide.find(x=>x.id===newSlideId);check(!!slide.deleted_at&&slide.media_id===image.id,'Conserva imagen y datos de slide oculto');
 check((await post('slide-state',{id:newSlideId,revision:slide.revision,action:'restore'})).ok,'Restaurar diapositiva');
 slideData=await (await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();slide=slideData.tables.slide.find(x=>x.id===newSlideId);check(!slide.deleted_at&&!slide.active,'Slide restaurado como borrador');
 check((await post('slide',{...newSlide,id:newSlideId,revision:slide.revision})).ok,'Publicar de nuevo diapositiva restaurada');
 check(slideData.tables.slide.filter(x=>x.id<=3).length===3,'Las tres diapositivas base se mantienen');
 check((await post('content',{...content,revision:settings.revision+1,slides:content.slides.map((s,i)=>({...s,id:i===0?newSlideId:s.id}))})).status===400,'Editor general no reemplaza slides base por adicionales');
 for(const [field,limit] of [['subtitle',32],['title',60],['description',150]]){
  const overLimit=await post('slide',{...newSlide,[field]:'X'.repeat(limit+1)});
  check(overLimit.status===400,'Rechaza exceso en '+field+' de slide adicional');
  check((await overLimit.json()).error.includes(String(limit)),'Explica límite en '+field);
 }
 const boundary=await post('slide',{...newSlide,title:'T'.repeat(60),subtitle:'S'.repeat(32),description:'D'.repeat(150)});check(boundary.ok,'Permite límites exactos de slide adicional');
 for(const [field,limit] of [['subtitle',32],['title',60],['description',150],['button_text',28]]){
  const oversizedBase={...content,revision:settings.revision+1,slides:content.slides.map((s,i)=>i===0?{...s,[field]:'X'.repeat(limit+1)}:s)};
  check((await post('content',oversizedBase)).status===400,'Rechaza exceso en '+field+' de slide base');
 }
 const invalidUpload=new FormData();invalidUpload.append('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'archivo.svg');check((await fetch(origin+'/admin/api/upload',{method:'POST',headers:{Origin:origin,Cookie:cookie,'x-ge-admin':'1'},body:invalidUpload})).status===400,'Rechaza SVG no permitido');
 check((await fetch(origin+'/.local/catalog.sqlite')).status===404,'Base no expuesta');
 const saleResponse=await post('product',{...payload,sku:'SALE-HTTP',discount_price:'80000'});check(saleResponse.ok,'Crear precio con descuento');const sale=await saleResponse.json();
 const saleCatalog=await(await fetch(origin+'/catalogo?discount=1')).text();check(saleCatalog.includes(sale.slug),'Filtro incluye descuento');check(saleCatalog.includes('discount-medal'),'Medalla de descuento');check(saleCatalog.includes('20%'),'Porcentaje calculado');check(!saleCatalog.includes('/catalogo/aquatech-lvt-lucca'),'Filtro excluye precio normal');
 const saleDetail=await(await fetch(origin+'/catalogo/'+sale.slug)).text();check(saleDetail.includes('80.000'),'Ficha usa precio de oferta');check(saleDetail.includes('40.000'),'Equivalente usa precio de oferta');
 check((await(await fetch(origin+'/catalogo/'+sale.slug)).text()).includes('data-price="8000000"'),'Simulador usa precio de oferta');
 const saleEditor=await(await fetch(origin+'/admin/productos/'+sale.id,{headers:{Cookie:cookie}})).text();check(saleEditor.includes('name="discount_price"'),'Editor contiene descuento');check(saleEditor.includes('value="80000"'),'Editor conserva descuento');
 check((await post('product',{...payload,sku:'SALE-INVALID',discount_price:'100000'})).status===400,'Rechaza descuento igual al precio normal');
 const saleExport=await(await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).json();const saleRow=saleExport.tables.product.find(row=>row.id===sale.id);
 check((await post('product',{...payload,id:sale.id,sku:'SALE-HTTP',revision:saleRow.revision,price:'70000',discount_price:'0'})).ok,'Quitar oferta y reducir precio de forma atómica');
 check(!(await(await fetch(origin+'/catalogo?discount=1')).text()).includes(sale.slug),'Quitar oferta elimina producto del filtro');
 await post('logout',{});check((await fetch(origin+'/admin/api/export',{headers:{Cookie:cookie}})).status===401,'Sesión revocada');
 console.log(checks+' comprobaciones HTTP correctas. Base y archivos de prueba aislados del sitio local.');
}catch(e){console.error(output);throw e;}finally{child.kill();}

