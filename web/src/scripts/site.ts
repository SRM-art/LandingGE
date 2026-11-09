document.querySelector('[data-menu]')?.addEventListener('click',e=>{const b=e.currentTarget as HTMLButtonElement;const open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));document.querySelector('.main-nav')?.classList.toggle('open',open);});
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(root=>{
  const slides=Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots=Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));

  let index=0;
  let timer:ReturnType<typeof setTimeout>|undefined;

  const show=(n:number)=>{
    index=(n+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.hidden=i!==index);
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
    const counter=root.querySelector('[data-counter]');
    if(counter)counter.textContent=String(index+1).padStart(2,'0');
  };
  const schedule=()=>{
    clearTimeout(timer);
    if(slides.length<2||document.hidden||root.contains(document.activeElement))return;
    timer=setTimeout(()=>{show(index+1);schedule();},6000);
  };


  root.addEventListener('focusin',schedule);
  root.addEventListener('focusout',()=>queueMicrotask(schedule));
  document.addEventListener('visibilitychange',schedule);

  schedule();
});
document.querySelectorAll('[data-gallery]').forEach(root=>{root.querySelectorAll<HTMLButtonElement>('[data-image]').forEach(b=>b.addEventListener('click',()=>{const img=root.querySelector<HTMLImageElement>('[data-main-image]');if(img){img.src=b.dataset.image!;img.alt=b.dataset.alt||'';}root.querySelectorAll('[data-image]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));});
const dialog=document.querySelector<HTMLDialogElement>('#whatsapp-dialog');let message='';document.querySelectorAll<HTMLButtonElement>('[data-whatsapp]').forEach(b=>b.addEventListener('click',()=>{message=b.dataset.whatsapp||'';const phone=document.body.dataset.whatsappNumber;if(phone){window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');}else{const target=document.getElementById('whatsapp-message');if(target)target.textContent=message;dialog?.showModal();}}));
document.querySelector('[data-close]')?.addEventListener('click',()=>dialog?.close());document.querySelector('[data-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message);document.getElementById('copy-status')!.textContent='Mensaje copiado.';}catch{document.getElementById('copy-status')!.textContent='Selecciona el mensaje para copiarlo.';}});
document.querySelector('[data-filter-toggle]')?.addEventListener('click',()=>document.querySelector('.filters')?.classList.toggle('open'));



