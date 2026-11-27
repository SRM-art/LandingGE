import { CatalogError } from '../domain/catalog-error.ts';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import { dataDir } from './db.local.ts';

export async function storeMedia(id: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const info = await sharp(bytes,{limitInputPixels:40_000_000}).metadata().catch(()=>null);
  if (!info || !['jpeg','png','webp'].includes(info.format ?? '') || (info.pages ?? 1)>1) {
    throw new CatalogError('Solo se permiten fotografías JPEG, PNG o WebP sin animación.');
  }
  const key = `uploads/${id}.${info.format==='jpeg'?'jpg':info.format}`;
  await mkdir(resolve(dataDir,'uploads'),{recursive:true});
  await writeFile(resolve(dataDir,key),bytes,{flag:'wx'});
  return {key, mime:'image/'+info.format, width:info.width ?? null, height:info.height ?? null};
}

export async function removeMedia(_id: string, key: string) {
  await rm(resolve(dataDir,key),{force:true});
}

export async function readMedia(id: string, key: string, size: number): Promise<BodyInit | null> {
  const source=resolve(dataDir,key);
  if (!source.startsWith(dataDir+sep)) return null;
  try {
    const target=resolve(dataDir,'variants',`${id}-${size}.webp`);
    try { return new Uint8Array(await readFile(target)); } catch { /* Generate a local variant on demand. */ }
    const bytes=await sharp(source,{limitInputPixels:40_000_000}).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:85}).toBuffer();
    await mkdir(resolve(dataDir,'variants'),{recursive:true});
    await writeFile(target,bytes);
    return new Uint8Array(bytes);
  } catch { return null; }
}
