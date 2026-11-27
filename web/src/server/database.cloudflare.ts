import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from 'cloudflare:workers';
import type { D1DatabaseSession, D1PreparedStatement } from '@cloudflare/workers-types';

const scope = new AsyncLocalStorage<{ db: D1DatabaseSession; writes: D1PreparedStatement[] }>();
const db = () => scope.getStore()?.db ?? env.DB.withSession('first-primary');
const revisionQuery = 'SELECT revision FROM application_revision WHERE id=1';
const bump = 'UPDATE application_revision SET revision=revision+1 WHERE id=1';
const guard = `UPDATE application_revision SET revision=CASE WHEN revision=? THEN revision+1 ELSE -1 END WHERE id=1`;

export async function all(sql: string, ...args: any[]): Promise<any[]> {
  return (await db().prepare(sql).bind(...args).all()).results;
}

export async function one(sql: string, ...args: any[]): Promise<any> {
  return (await db().prepare(sql).bind(...args).first()) ?? undefined;
}

export async function run(sql: string, ...args: any[]): Promise<void> {
  const transaction = scope.getStore();
  if (transaction) {
    transaction.writes.push(transaction.db.prepare(sql).bind(...args));
    return;
  }
  const session = db();
  await session.batch([session.prepare(bump), session.prepare(sql).bind(...args)]);
}

// Reads take place before the batch. Every write increments the same revision,
// so a concurrent commit causes D1 to reject the complete batch and retry the reads.
export async function transaction<T>(task: () => Promise<T>): Promise<T> {
  if (scope.getStore()) return task();
  for (let attempt = 0; attempt < 4; attempt++) {
    const session = db();
    const revision = await session.prepare(revisionQuery).first<number>('revision');
    if (revision === null) throw new Error('Falta inicializar la base de datos.');
    const writes: D1PreparedStatement[] = [];
    const result = await scope.run({db:session, writes}, task);
    if (!writes.length) return result;
    try {
      await session.batch([session.prepare(guard).bind(revision), ...writes]);
      return result;
    } catch (error) {
      if (!String(error).includes('ge_revision_guard')) throw error;
    }
  }
  throw new Error('Hay otra operación guardando cambios. Inténtalo de nuevo.');
}
