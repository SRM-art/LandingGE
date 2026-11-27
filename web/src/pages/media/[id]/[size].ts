import type { APIRoute } from 'astro';
import {readMedia} from '#media';
import {one,mediaVisible} from '../../../server/db.ts';
export const GET:APIRoute=async({params,locals})=>{
 const id=params.id||'';const size=Number(params.size);if(![480,960,1600].includes(size))return new Response(null,{status:404});
 const media=await one('SELECT storage_key FROM media WHERE id=?',id);
 if(!media||(!locals.isAdmin&&!await mediaVisible(id)))return new Response(null,{status:404});
 const body=await readMedia(id,media.storage_key,size);
 return body?new Response(body,{headers:{'Content-Type':'image/webp','Cache-Control':'no-store'}}):new Response(null,{status:404});
};
