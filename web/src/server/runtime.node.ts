import { scrypt } from 'node:crypto';
import { localMessages, sendLocalMail } from './local-mail.ts';

export const production = false;
export const publicOrigin = () => '';
export const allowSetup = (_email: unknown, _secret: unknown) => true;
export async function sendMail(mail: Parameters<typeof sendLocalMail>[0]) { sendLocalMail(mail); }
export const indexPublicSite = () => false;
export { localMessages };
export const passwordScheme = 'scrypt:32768:8:3';

export async function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, {
    N:32768, r:8, p:3, maxmem:64*1024*1024,
  }, (error, key) => error ? reject(error) : resolve(key)));
}
