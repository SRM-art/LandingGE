const linkToken=document.querySelector<HTMLInputElement>('[data-link-token]');
if(linkToken?.form){
 const fragment=new URLSearchParams(location.hash.slice(1)).get('token');
 if(fragment!==null || linkToken.value)history.replaceState(null,'',location.pathname);
 if(fragment && /^[a-f0-9]{64}$/.test(fragment)){
  linkToken.value=fragment;
  linkToken.form.hidden=false;
  const notice=document.querySelector<HTMLElement>('[data-link-notice]');
  if(notice)notice.hidden=true;
 }
}

document.querySelectorAll<HTMLButtonElement>('[data-show-password]').forEach(button=>button.addEventListener('click',()=>{
 const input=document.getElementById(button.dataset.showPassword!) as HTMLInputElement;
 input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Mostrar':'Ocultar';button.setAttribute('aria-pressed',String(input.type==='text'));
}));
document.querySelectorAll<HTMLFormElement>('[data-auth-form]').forEach(form=>{
 const status=form.querySelector<HTMLElement>('[data-auth-status]')!;
 const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;
 form.addEventListener('reset',event=>{
  if(button.disabled){event.preventDefault();return;}
  status.textContent='';
  status.classList.remove('error');
 });
 form.querySelector('.form-actions a')?.addEventListener('click',event=>{
  if(button.disabled)event.preventDefault();
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(button.disabled)return;
  const data=Object.fromEntries(new FormData(form));
  if('confirmation' in data && data.password!==data.confirmation){status.textContent='Las contraseñas no coinciden.';status.classList.add('error');return;}
  if(form.dataset.confirm && !confirm(form.dataset.confirm))return;
  button.disabled=true;status.textContent='Procesando…';status.classList.remove('error');
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
