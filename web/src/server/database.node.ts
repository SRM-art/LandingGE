import { AsyncLocalStorage } from 'node:async_hooks';
import db, { all as readAll, one as readOne, run as write } from './db.local.ts';

const connection = new AsyncLocalStorage<{ active: boolean }>();
let tail: Promise<unknown> = Promise.resolve();

function exclusive<T>(task: () => T | Promise<T>): Promise<T> {
  if (connection.getStore()?.active) return Promise.resolve().then(task);
  const operation = tail.then(task);
  tail = operation.catch(() => undefined);
  return operation;
}

export const all = (sql: string, ...args: any[]) => exclusive(() => readAll(sql, ...args));
export const one = (sql: string, ...args: any[]) => exclusive(() => readOne(sql, ...args));
export const run = (sql: string, ...args: any[]) => exclusive(() => { write(sql, ...args); });

export function transaction<T>(task: () => Promise<T>): Promise<T> {
  if (connection.getStore()?.active) return task();
  return exclusive(() => {
    const scope = {active:true};
    return connection.run(scope, async () => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await task();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      } finally {
        scope.active = false;
      }
    });
  });
}
