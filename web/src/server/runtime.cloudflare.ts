import { timingSafeEqual } from 'node:crypto';
import { env } from 'cloudflare:workers';
import { argon2idAsync } from '@noble/hashes/argon2.js';

export const production = true;
export const publicOrigin = () => String(env.PUBLIC_ORIGIN || '');
export const indexPublicSite = () => env.ALLOW_INDEXING === '1';
export const localMessages = (): import('./local-mail.ts').LocalMail[] => [];
export const passwordScheme = 'argon2id:19456:2:1';

export function allowSetup(email: unknown, secret: unknown) {
  const owner = env.GE_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || typeof email !== 'string' || typeof secret !== 'string' || email.trim().toLowerCase() !== owner) return false;
  const configured = String(env.GE_SETUP_TOKEN || '');
  if (configured.length < 32 || secret.length !== configured.length) return false;
  const expected = Buffer.from(configured), supplied = Buffer.from(secret);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function derivePassword(password: string, salt: string) {
  return Buffer.from(await argon2idAsync(password, Buffer.from(salt,'hex'), {m:19456,t:2,p:1,dkLen:64}));
}

export async function sendMail(mail: import('./local-mail.ts').LocalMail) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !publicOrigin()) throw new Error('El correo transaccional no está configurado.');
  const routes: Record<string,string> = {invite:'/admin/activar', reset:'/admin/restablecer', email:'/admin/confirmar-correo'};
  const entry = routes[mail.purpose];
  const link = entry && mail.token ? new URL(entry, publicOrigin()) : undefined;
  if (link && mail.token) link.hash = 'token=' + mail.token;
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`, 'Content-Type':'application/json'},
    body:JSON.stringify({from:env.MAIL_FROM,to:[mail.to],subject:'Gestión Esencial · Acceso administrativo',
      text:mail.text ?? `Abre este enlace para continuar: ${link}\nSi no solicitaste este cambio, ignora el mensaje.`,
      ...(env.MAIL_REPLY_TO ? {reply_to:env.MAIL_REPLY_TO} : {}),
    }),
    signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No se pudo enviar el correo transaccional.');
}
