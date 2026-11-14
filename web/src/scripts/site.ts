document.querySelector('[data-menu]')?.addEventListener('click',e=>{const b=e.currentTarget as HTMLButtonElement;const open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));document.querySelector('.main-nav')?.classList.toggle('open',open);});
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(root => {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
  if (slides.length < 2) return;

  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let gesture: {id: number; x: number; y: number} | undefined;
  let suppressClickUntil = 0;
  const show = (n: number) => {
    index = (n + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.hidden = i !== index);
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    const counter = root.querySelector('[data-counter]');
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
  };
  const schedule = () => {
    clearTimeout(timer);
    // Keep a focused call-to-action readable; arrow controls can resume autoplay.
    if (document.hidden || gesture || root.querySelector('.hero-copy :focus')) return;
    timer = setTimeout(() => { show(index + 1); schedule(); }, 9000);
  };
  const move = (step: number) => { show(index + step); schedule(); };
  root.querySelectorAll<HTMLButtonElement>('[data-carousel-step]').forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.carouselStep)));
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  root.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
    clearTimeout(timer);
  });
  root.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = undefined;
    const threshold = Math.max(40, Math.min(80, root.clientWidth * .12));
    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClickUntil = Date.now() + 500;
      move(dx < 0 ? 1 : -1);
    } else schedule();
  });
  root.addEventListener('pointercancel', () => { gesture = undefined; schedule(); });
  root.addEventListener('pointerout', event => {
    if (gesture && !root.contains(event.relatedTarget as Node | null)) {
      gesture = undefined;
      schedule();
    }
  });
  // A swipe beginning over the catalog link must not also activate that link.
  root.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => queueMicrotask(schedule));
  document.addEventListener('visibilitychange', schedule);
  schedule();
});
document.querySelectorAll('[data-gallery]').forEach(root=>{root.querySelectorAll<HTMLButtonElement>('[data-image]').forEach(b=>b.addEventListener('click',()=>{const img=root.querySelector<HTMLImageElement>('[data-main-image]');if(img){img.src=b.dataset.image!;img.alt=b.dataset.alt||'';}root.querySelectorAll('[data-image]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));});
const dialog=document.querySelector<HTMLDialogElement>('#whatsapp-dialog');let message='';document.querySelectorAll<HTMLButtonElement>('[data-whatsapp]').forEach(b=>b.addEventListener('click',()=>{message=b.dataset.whatsapp||'';const phone=document.body.dataset.whatsappNumber;if(phone){window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');}else{const target=document.getElementById('whatsapp-message');if(target)target.textContent=message;dialog?.showModal();}}));
document.querySelector('[data-close]')?.addEventListener('click',()=>dialog?.close());document.querySelector('[data-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message);document.getElementById('copy-status')!.textContent='Mensaje copiado.';}catch{document.getElementById('copy-status')!.textContent='Selecciona el mensaje para copiarlo.';}});
document.querySelector('[data-filter-toggle]')?.addEventListener('click',()=>document.querySelector('.filters')?.classList.toggle('open'));




// Native horizontal scrolling supplies touch swipes without intercepting vertical page scroll.
document.querySelectorAll<HTMLElement>('[data-offers-carousel]').forEach(root => {
  const track = root.querySelector<HTMLElement>('[data-offers-track]');
  const controls = root.querySelector<HTMLElement>('[data-offers-controls]');
  const dots = root.querySelector<HTMLElement>('[data-offers-dots]');
  if (!track || !controls || !dots) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dragging = false;
  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const stepWidth = () => {
    const card = track.querySelector<HTMLElement>('.product-card');
    return card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0)
      : track.clientWidth;
  };
  const positionCount = () => Math.max(1, Math.ceil((maxScroll() - 2) / stepWidth()) + 1);
  const currentPosition = () => maxScroll() - track.scrollLeft <= 2 ? positionCount() - 1
    : Math.max(0, Math.min(positionCount() - 1, Math.round(track.scrollLeft / stepWidth())));
  const goTo = (index: number) => {
    track.scrollTo({left: Math.min(maxScroll(), index * stepWidth()), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    schedule();
  };
  const update = () => {
    controls.hidden = maxScroll() < 2;
    const count = positionCount();
    const current = currentPosition();
    if (dots.children.length !== count) {
      dots.replaceChildren(...Array.from({length: count}, (_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'offers-position-dot';
        button.setAttribute('aria-label', `Ir a la posición ${index + 1} de ${count}`);
        button.addEventListener('click', () => goTo(index));
        return button;
      }));
    }
    Array.from(dots.children).forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === current)));
  };
  const schedule = () => {
    clearTimeout(timer);
    if (document.hidden || dragging || maxScroll() < 2
      || track.contains(document.activeElement)) return;
    timer = setTimeout(() => move(1), 6000);
  };
  const move = (direction: number) => {
    const count = positionCount();
    goTo((currentPosition() + direction + count) % count);
  };
  root.querySelectorAll<HTMLButtonElement>('[data-offers-step]').forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.offersStep)));
  });
  track.addEventListener('scroll', () => { update(); schedule(); }, {passive: true});
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  track.addEventListener('pointerdown', () => { dragging = true; schedule(); });
  track.addEventListener('pointerup', () => { dragging = false; schedule(); });
  track.addEventListener('pointercancel', () => { dragging = false; schedule(); });
  root.addEventListener('pointerleave', () => { dragging = false; schedule(); });
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => queueMicrotask(schedule));
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
  new ResizeObserver(() => { update(); schedule(); }).observe(track);
  update(); schedule();
});
