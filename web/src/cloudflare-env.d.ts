declare module 'cloudflare:workers' {
  export const env: {
    DB: import('@cloudflare/workers-types').D1Database;
    MEDIA: import('@cloudflare/workers-types').R2Bucket;
    IMAGES: import('@cloudflare/workers-types').ImagesBinding;
    PUBLIC_ORIGIN?: string;
    ALLOW_INDEXING?: string;
    GE_OWNER_EMAIL?: string;
    GE_SETUP_TOKEN?: string;
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
    MAIL_REPLY_TO?: string;
  };
}
