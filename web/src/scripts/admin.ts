import {formatCopInput,plainCopInput} from '../domain/cop-input';
import {decimalScaled,equivalent,money,parseDiscountPrice,productPricing} from '../domain/pricing';
type Img={id:string,alt:string};const galleries=new Map<string,Img[]>();
document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-character-limit]').forEach(input=>{
 const counter=document.getElementById(input.getAttribute('aria-describedby')||'');
 const update=()=>{
  if(!counter)return;
  counter.textContent=`${input.value.length} / ${input.maxLength} caracteres`;
  counter.dataset.overLimit=String(input.value.length>input.maxLength);
  input.setCustomValidity(input.value.length>input.maxLength?`Máximo ${input.maxLength} caracteres.`:'');
 };
 input.addEventListener('input',update);update();
});
async function api(action:string,body:unknown){const r=await fetch('/admin/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','x-ge-admin':'1'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error||'No se pudo guardar. Inténtalo de nuevo.');return result;}
function toast(message:string){const el=document.getElementById('toast')!;el.textContent=message;el.hidden=false;setTimeout(()=>el.hidden=true,4500);}
document.querySelector('[data-logout]')?.addEventListener('click',async()=>{try{await api('logout',{});location.href='/admin/login';}catch(e){toast((e as Error).message);}});
document.querySelectorAll<HTMLButtonElement>('[data-state]').forEach(b=>b.addEventListener('click',async()=>{const restore=b.dataset.state==='restore';if(!confirm(restore?'¿Restaurar este registro como borrador? Podrás revisarlo antes de publicarlo.':'¿Ocultar este registro del sitio? Se conservarán la información, las imágenes y las relaciones.'))return;b.disabled=true;try{await api('state',{kind:b.dataset.kind,id:b.dataset.id,action:b.dataset.state});location.reload();}catch(e){toast((e as Error).message);b.disabled=false;}}));
document.querySelectorAll<HTMLElement>('[data-image-editor]').forEach(root=>{const field=root.dataset.field!;const images:Img[]=JSON.parse(root.dataset.images||'[]');galleries.set(field,images);const list=root.querySelector<HTMLElement>('[data-image-list]')!;const input=root.querySelector<HTMLInputElement>('[data-upload]')!;const status=root.querySelector<HTMLElement>('[data-upload-status]')!;const single=root.dataset.single==='true';
 const render=()=>{list.replaceChildren();images.forEach((im,index)=>{const card=document.createElement('div');card.className='image-edit-card';const img=document.createElement('img');img.src='/media/'+im.id+'/480';img.alt=im.alt||'Imagen cargada';card.append(img);const text=document.createElement('input');text.placeholder='Descripción de la imagen';text.ariaLabel='Descripción de la imagen '+(index+1);text.value=im.alt;text.maxLength=200;text.addEventListener('input',()=>im.alt=text.value);if(!single)card.append(text);const controls=document.createElement('div');controls.className='image-controls';const label=document.createElement('span');label.textContent=single?'Imagen seleccionada':index===0?'Portada':'Imagen '+(index+1);controls.append(label);const button=(label:string,fn:()=>void,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',fn);controls.append(b);};if(!single){button('↑',()=>{[images[index-1],images[index]]=[images[index],images[index-1]];render();},index===0);button('↓',()=>{[images[index+1],images[index]]=[images[index],images[index+1]];render();},index===images.length-1);}button('Quitar',()=>{images.splice(index,1);root.dispatchEvent(new Event('input',{bubbles:true}));render();});card.append(controls);list.append(card);});};render();
 input.addEventListener('change',async()=>{const files=Array.from(input.files||[]);input.disabled=true;document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach(b=>b.disabled=true);try{for(const file of files){if(!single&&images.length>=20)throw new Error('La galería admite hasta 20 imágenes.');if(file.size>10*1024*1024)throw new Error(file.name+' excede los 10 MB.');status.textContent='Cargando '+file.name+'…';const body=new FormData();body.append('file',file);const r=await fetch('/admin/api/upload',{method:'POST',headers:{'x-ge-admin':'1'},body});const result=await r.json();if(!r.ok)throw new Error(result.error||'No se pudo cargar la imagen.');if(single)images.splice(0,images.length);images.push({id:result.id,alt:file.name.replace(/\.[^.]+$/,'')});render();}status.textContent='Imagen cargada. Guarda el formulario para aplicar el cambio.';}catch(e){status.textContent=(e as Error).message;}finally{input.disabled=false;input.value='';document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach(b=>b.disabled=false);}});
});
function val(f:FormData,name:string){return String(f.get(name)||'').trim();}
function bindForm(selector:string,getPayload:(f:FormData,form:HTMLFormElement)=>unknown,action:string){const form=document.querySelector<HTMLFormElement>(selector);if(!form)return;let dirty=false;form.addEventListener('input',()=>dirty=true);window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();}});form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector<HTMLButtonElement>('[data-save]')!;const status=form.querySelector<HTMLElement>('[data-form-status]')!;button.disabled=true;status.classList.remove('error');status.textContent='Guardando…';try{const result=await api(action,getPayload(new FormData(form),form));dirty=false;status.textContent='Cambios guardados.';if(action==='content'){form.dataset.revision=String(Number(form.dataset.revision)+1);toast('Contenido actualizado.');}else if(action==='slide'){location.href='/admin/contenidos?saved=1#diapositivas-adicionales';}else{location.href='/admin/'+(action==='product'?'productos':'proyectos')+'/'+result.id+'?saved=1';}}catch(e){status.classList.add('error');status.textContent=(e as Error).message;}finally{button.disabled=false;}});}
const record=document.querySelector<HTMLFormElement>('[data-record-form]');if(record){const kind=record.dataset.kind!;bindForm('[data-record-form]',(f,form)=>{const data:any={...(form.dataset.id?{id:form.dataset.id,revision:Number(form.dataset.revision)}:{}),sku:val(f,'sku'),name:val(f,'name'),description:val(f,'description'),state:val(f,'state')||'draft',featured:f.has('featured'),images:galleries.get('images')||[]};if(kind==='product'){Object.assign(data,{category_id:Number(val(f,'category_id')),presentation_code:val(f,'presentation_code'),price:plainCopInput(val(f,'price')),discount_price:plainCopInput(val(f,'discount_price')),external_sku:val(f,'external_sku'),measures:['M2','KG','ML','PIEZA'].map(code=>({code,value:val(f,'measure_'+code)})),facets:f.getAll('facets').map(Number),sheet:Object.fromEntries(['length_mm','width_mm','thickness_mm','warranty','recommendations','advantages'].map(k=>[k,val(f,'sheet_'+k)]))});}else Object.assign(data,{city_id:Number(val(f,'city_id')),sector_id:Number(val(f,'sector_id')),product_ids:f.getAll('product_ids')});return data;},kind);}
bindForm('[data-content-form]',(f,form)=>({...Object.fromEntries(['whatsapp','phone','email','address','hours','about_title','about_text'].map(k=>[k,val(f,k)])),revision:Number(form.dataset.revision),about_media_id:galleries.get('about_image')?.[0]?.id||null,slides:Array.from(form.querySelectorAll<HTMLElement>('[data-slide-editor]')).map(el=>{const id=Number(el.dataset.slideId);const prefix='slide_'+id+'_';return {id,...Object.fromEntries(['title','subtitle','description','button_text','button_href'].map(k=>[k,val(f,prefix+k)])),media_id:galleries.get(prefix+'image')?.[0]?.id||'',active:true};}),services:Array.from(form.querySelectorAll<HTMLElement>('[data-service-editor]')).map(el=>{const id=Number(el.dataset.serviceId);return {id,title:val(f,'service_'+id+'_title'),description:val(f,'service_'+id+'_description')};})}),'content');
function updatePrice() {
 const output = document.querySelector<HTMLElement>('[data-price-preview]');
 const discountOutput = document.querySelector<HTMLElement>('[data-discount-preview]');
 if (!output) return;
 const price = document.querySelector<HTMLInputElement>('[data-price]')?.value || '';
 const discountInput = document.querySelector<HTMLInputElement>('[data-discount-price]');
 const values: string[] = [];
 discountInput?.setCustomValidity('');
 try {
  const regular = decimalScaled(plainCopInput(price), 100);
  const discount = parseDiscountPrice(plainCopInput(discountInput?.value || ''));
  if (discount && discount >= regular) {
   const message = 'El precio con descuento debe ser menor que el precio normal.';
   discountInput?.setCustomValidity(message);
   throw new Error(message);
  }
  const pricing = productPricing({price_cents: regular, discount_price_cents: discount});
  if (discountOutput) discountOutput.textContent = pricing.hasDiscount
   ? `${pricing.discountLabel}% de descuento · Precio final: ${money(pricing.final!)}`
   : 'Sin descuento. Se mostrará el precio normal.';
  document.querySelectorAll<HTMLInputElement>('[data-measure]').forEach(input => {
   if (input.value.trim()) {
    const amount = equivalent(pricing.final!, decimalScaled(input.value, 10000));
    if (amount !== null) values.push(money(amount) + ' / ' + input.dataset.symbol);
   }
  });
  output.textContent = values.length ? 'Equivalentes informativos: ' + values.join(' · ')
   : 'Agrega el contenido de la presentación para calcular los equivalentes.';
 } catch (error) {
  output.textContent = 'Agrega precio y contenido válidos para ver los equivalentes.';
  if (discountOutput) discountOutput.textContent = (error as Error).message;
 }
}
document.querySelectorAll<HTMLInputElement>('[data-price],[data-discount-price]').forEach(input => {
 // Initial values come from stored cents as a plain decimal, before display formatting.
 input.value = formatCopInput(input.value.replace('.', ','));
 input.addEventListener('input', () => {
  const start = input.selectionStart ?? input.value.length;
  const significant = input.value.slice(0, start).replace(/[^0-9,]/g, '').length;
  input.value = formatCopInput(input.value);
  let caret = 2;
  let seen = 0;
  while (caret < input.value.length && seen < significant) {
   if (/[0-9,]/.test(input.value[caret])) seen++;
   caret++;
  }
  input.setSelectionRange(caret, caret);
 });
});
document.querySelectorAll('[data-price],[data-discount-price],[data-measure]').forEach(input => input.addEventListener('input', updatePrice));
updatePrice();

document.querySelector<HTMLInputElement>('[data-relation-search]')?.addEventListener('input',e=>{const q=(e.target as HTMLInputElement).value.toLocaleLowerCase();document.querySelectorAll<HTMLElement>('[data-relation-row]').forEach(row=>row.hidden=!row.textContent?.toLocaleLowerCase().includes(q));});
if(new URLSearchParams(location.search).has('saved'))toast('Cambios guardados correctamente.');



bindForm('[data-custom-slide-form]',(f,form)=>({
 ...(form.dataset.id?{id:Number(form.dataset.id),revision:Number(form.dataset.revision)}:{}),
 title:val(f,'title'),subtitle:val(f,'subtitle'),description:val(f,'description'),
 images:galleries.get('custom_slide_image')||[],active:f.has('active'),
}),'slide');

document.querySelectorAll<HTMLButtonElement>('[data-slide-state]').forEach(button=>button.addEventListener('click',async()=>{
 const restore=button.dataset.slideState==='restore';
 if(!confirm(restore?'¿Restaurar la diapositiva como borrador?':'¿Quitar esta diapositiva del carrusel? Se conservarán su imagen y textos.'))return;
 button.disabled=true;
 try{await api('slide-state',{id:Number(button.dataset.id),revision:Number(button.dataset.revision),action:button.dataset.slideState});location.reload();}
 catch(error){toast((error as Error).message);button.disabled=false;}
}));
