document.querySelectorAll<HTMLButtonElement>('[data-show-password]').forEach(button=>button.addEventListener('click',()=>{
 const input=document.getElementById(button.dataset.showPassword!) as HTMLInputElement;
 input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Mostrar':'Ocultar';button.setAttribute('aria-pressed',String(input.type==='text'));
}));
document.querySelectorAll<HTMLFormElement>('[data-auth-form]').forEach(form=>{
 form.addEventListener('submit',async e=>{
  e.preventDefault();const status=form.querySelector<HTMLElement>('[data-auth-status]')!;
  const data=Object.fromEntries(new FormData(form));
  if('confirmation' in data && data.password!==data.confirmation){status.textContent='Las contraseñas no coinciden.';status.classList.add('error');return;}
  if(form.dataset.confirm && !confirm(form.dataset.confirm))return;
  const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;status.textContent='Procesando…';status.classList.remove('error');
  try{
   const response=await fetch('/admin/api/auth/'+form.dataset.authForm,{method:'POST',headers:{'Content-Type':'application/json','x-ge-admin':'1'},body:JSON.stringify(data)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo completar la acción.');
   if(result.redirect){location.assign(result.redirect);return;}
   if(result.refresh){location.reload();return;}
   status.textContent=result.message||'Cambios guardados.';
   form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input=>input.value='');
  }catch(error){status.textContent=(error as Error).message;status.classList.add('error');}
  finally{button.disabled=false;}
 });
});
