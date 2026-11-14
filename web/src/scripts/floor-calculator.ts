import {estimateFloor} from '../domain/floor-calculator';
import {money,quantity} from '../domain/pricing';
document.querySelectorAll<HTMLElement>('[data-floor-calculator]').forEach(root=>{
 const modal=root.querySelector<HTMLDialogElement>('[data-floor-dialog]');
 const open=root.querySelector<HTMLButtonElement>('[data-floor-open]');
 const close=root.querySelector<HTMLButtonElement>('[data-floor-close]');
 let previousOverflow='';
 if(modal&&open){
  open.addEventListener('click',()=>{
   if(modal.open)return;
   previousOverflow=document.documentElement.style.overflow;
   modal.showModal();
   document.documentElement.style.overflow='hidden';
   modal.querySelector<HTMLInputElement>('[data-floor-area]')?.focus({preventScroll:true});
  });
  close?.addEventListener('click',()=>modal.close());
  modal.addEventListener('close',()=>{
   document.documentElement.style.overflow=previousOverflow;
   open.focus({preventScroll:true});
  });
  let startedOutside=false;
  const outside=(event:MouseEvent)=>{
   const box=modal.getBoundingClientRect();
   return event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom;
  };
  modal.addEventListener('pointerdown',event=>{startedOutside=event.target===modal&&outside(event);});
  modal.addEventListener('click',event=>{if(startedOutside&&event.target===modal&&outside(event))modal.close();});
 }
 const form=root.querySelector<HTMLFormElement>('[data-floor-form]');
 const area=root.querySelector<HTMLInputElement>('[data-floor-area]');
 const waste=root.querySelector<HTMLInputElement>('[data-floor-waste]');
 const result=root.querySelector<HTMLElement>('[data-floor-result]');
 const error=root.querySelector<HTMLElement>('[data-floor-error]');
 if(!form||!area||!waste||!result||!error)return;
 const clear=()=>{result.hidden=true;error.textContent='';area.removeAttribute('aria-invalid');waste.removeAttribute('aria-invalid');};
 form.addEventListener('input',clear);
 form.addEventListener('submit',event=>{
  event.preventDefault();clear();
  try{
   if(!area.value.trim())throw new Error('Ingresa el área de tu piso en m².');
   const wastePercent=waste.value.trim()?Number(waste.value):NaN;
   const estimate=estimateFloor(area.value,wastePercent,Number(root.dataset.coverage),root.dataset.price?Number(root.dataset.price):null);
   const set=(selector:string,value:string)=>{root.querySelector<HTMLElement>(selector)!.textContent=value;};
   const boxes=new Intl.NumberFormat('es-CO').format(estimate.boxes);
   set('[data-floor-boxes]',boxes+(estimate.boxes===1?' caja':' cajas'));
   set('[data-floor-required]',quantity(estimate.requiredScaled)+' m² (+'+estimate.waste+' %)');
   set('[data-floor-covered]',quantity(estimate.coveredScaled)+' m²');
   set('[data-floor-total]',estimate.totalCents!==null?money(estimate.totalCents):'Consultar valor');
   const whatsapp=result.querySelector<HTMLButtonElement>('[data-whatsapp]');
   if(whatsapp)whatsapp.dataset.whatsapp=`Hola, estoy interesado en ${root.dataset.product} (referencia ${root.dataset.sku}) y me interesa más información. Para un área de ${quantity(estimate.areaScaled)} m², con ${estimate.waste}% de excedente, el simulador estima ${boxes} ${estimate.boxes===1?'caja':'cajas'} (${quantity(estimate.coveredScaled)} m²). Quisiera confirmar la cantidad y disponibilidad.`;
   result.hidden=false;
  }catch(cause){error.textContent=(cause as Error).message;area.setAttribute('aria-invalid','true');if(!waste.checkValidity()||!waste.value.trim())waste.setAttribute('aria-invalid','true');}
 });
});
