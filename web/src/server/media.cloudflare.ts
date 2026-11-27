import { env } from 'cloudflare:workers';

const sizes = [480, 960, 1600];
const bucket = () => env.MEDIA;
const variants = (id: string) => sizes.map(size => `variants/${id}-${size}.webp`);

export async function storeMedia(id: string, file: File) {
  const images = env.IMAGES;
  const source = () => file.stream() as unknown as Parameters<typeof images.info>[0];
  const info = await images.info(source());
  if (!('width' in info) || !['image/jpeg','image/png','image/webp'].includes(info.format) || info.width*info.height>40_000_000) {
    throw new Error('Selecciona una foto JPEG, PNG o WebP de hasta 40 megapíxeles.');
  }
  const key = `uploads/${id}.${info.format.split('/')[1]}`;
  const objects = variants(id);
  const results = await Promise.allSettled(sizes.map(async (size,index) => {
    const result = await images.input(source()).transform({width:size,fit:'scale-down'}).output({format:'image/webp',quality:85,anim:false});
    await bucket().put(objects[index], await result.response().arrayBuffer(), {httpMetadata:{contentType:'image/webp'}});
  }));
  try {
    if(results.some(result=>result.status==='rejected')) throw new Error('No se pudieron generar los tamaños de la imagen.');
    await bucket().put(key,await file.arrayBuffer(),{httpMetadata:{contentType:info.format}});
  } catch(error) {
    await removeMedia(id,key);
    throw error;
  }
  return {key,mime:info.format,width:info.width,height:info.height};
}

export async function removeMedia(id: string, key: string) {
  await bucket().delete([key,...variants(id)]);
}

export async function readMedia(id: string, _key: string, size: number): Promise<BodyInit | null> {
  const object = await bucket().get(`variants/${id}-${size}.webp`);
  return object ? object.body as unknown as ReadableStream<Uint8Array> : null;
}
