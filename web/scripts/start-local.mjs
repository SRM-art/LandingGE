process.env.HOST = '127.0.0.1';
process.env.PORT = '4321';
process.env.LOCAL_PREVIEW = '1';
await import('../dist/server/entry.mjs');
