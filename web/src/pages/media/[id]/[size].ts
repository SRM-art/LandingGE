import type { APIRoute } from 'astro';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { one,mediaVisible,dataDir } from '../../../server/db.ts';
export const GET:APIRoute=async({params,locals})=>{
 const id=params.id||'';const size=Number(params.size);if(![480,960,1600].includes(size))return new Response(null,{status:404});
 const media=one('SELECT * FROM media WHERE id=?',id);if(!media||(!locals.isAdmin&&!mediaVisible(id)))return new Response(null,{status:404});
 const source=resolve(dataDir,media.storage_key);if(!source.startsWith(dataDir+ '\\')&&!source.startsWith(dataDir+'/'))return new Response(null,{status:404});
 try {const target=resolve(dataDir,'variants',id+'-'+size+'.webp');let bytes;try{bytes=await readFile(target);}catch{bytes=await sharp(source,{limitInputPixels:40_000_000}).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:85}).toBuffer();await mkdir(resolve(dataDir,'variants'),{recursive:true});await writeFile(target,bytes);}return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','Cache-Control':'no-store'}});}catch{return new Response(null,{status:404});}
};
