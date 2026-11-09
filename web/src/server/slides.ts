import {z} from 'zod';
import {one,run,transaction,audit} from './db.ts';
import {carouselText} from './carousel-validation.ts';

const slideInput=z.object({
 id:z.number().int().positive().optional(),revision:z.number().int().positive().optional(),
 title:carouselText('title',3),
 subtitle:carouselText('subtitle'),description:carouselText('description'),
 images:z.array(z.object({id:z.uuid(),alt:z.string().max(200).default('')})).length(1,'Selecciona una imagen.'),
 active:z.boolean(),
});

function currentSlide(id:number,revision:number|undefined){
 if(id<=3)throw new Error('Las tres diapositivas base se conservan. Edita su contenido en Inicio y contacto.');
 const slide=one('SELECT * FROM slide WHERE id=?',id);
 if(!slide)throw new Error('La diapositiva no existe.');
 if(slide.revision!==revision)throw new Error('La diapositiva cambió en otra pestaña. Recarga antes de guardar.');
 return slide;
}

export function saveSlide(input:unknown){
 const d=slideInput.parse(input);
 if(!one('SELECT 1 FROM media WHERE id=?',d.images[0].id))throw new Error('Selecciona una imagen válida.');
 return transaction(()=>{
  const old=d.id?currentSlide(d.id,d.revision):null;
  if(old?.deleted_at&&d.active)throw new Error('Restaura la diapositiva antes de mostrarla.');
  const now=new Date().toISOString();
  let id:number;
  if(old){
   id=old.id;
   run("UPDATE slide SET title=?,subtitle=?,description=?,media_id=?,active=?,button_text='Explorar el catálogo',button_href='/catalogo',revision=revision+1,updated_at=? WHERE id=?",d.title,d.subtitle,d.description,d.images[0].id,Number(d.active),now,id);
  }else{
   const position=one('SELECT COALESCE(MAX(position),-1)+1 AS next FROM slide').next;
   const result=run("INSERT INTO slide(title,subtitle,description,button_text,button_href,media_id,position,active,updated_at) VALUES(?,?,?,'Explorar el catálogo','/catalogo',?,?,?,?)",d.title,d.subtitle,d.description,d.images[0].id,position,Number(d.active),now);
   id=Number(result.lastInsertRowid);
  }
  audit(old?'diapositiva_actualizada':'diapositiva_creada',d.title);
  return {id};
 });
}

export function changeSlideState(input:unknown){
 const d=z.object({id:z.number().int().positive(),revision:z.number().int().positive(),action:z.enum(['hide','restore'])}).parse(input);
 return transaction(()=>{
  const old=currentSlide(d.id,d.revision);const now=new Date().toISOString();
  run('UPDATE slide SET deleted_at=?,active=0,revision=revision+1,updated_at=? WHERE id=?',d.action==='hide'?now:null,now,d.id);
  audit(d.action==='hide'?'diapositiva_oculta':'diapositiva_restaurada',old.title);
  return {ok:true};
 });
}
