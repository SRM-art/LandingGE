if(process.env.GE_CONTAINER_REVIEW!=='1')throw new Error('Este iniciador se utiliza dentro del contenedor de revisión.');
process.env.HOST='0.0.0.0';
process.env.PORT='4322';
process.env.LOCAL_PREVIEW='1';
await import('../dist/server/entry.mjs');
await import('./review-proxy.mjs');
