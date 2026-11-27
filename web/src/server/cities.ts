import { z } from 'zod';
import { all, audit, one, run, transaction } from './db.ts';

const cityName = z.string().transform(value => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
  .pipe(z.string().min(1, 'Escribe el nombre de la ciudad.').max(100, 'Usa hasta 100 caracteres.'));
const cityAction = z.discriminatedUnion('action', [
  z.object({action: z.literal('create'), name: cityName}),
  z.object({action: z.enum(['hide', 'restore']), id: z.number().int().positive()}),
]);

export async function manageCity(input: unknown) {
  const change = cityAction.parse(input);
  return (await transaction(async () => {
    if (change.action === 'create') {
      const collator = new Intl.Collator('es-CO', {sensitivity: 'base'});
      const duplicate = (await all('SELECT name, deleted_at FROM city'))
        .find(city => collator.compare(city.name, change.name) === 0);
      if (duplicate) throw new Error(duplicate.deleted_at
        ? 'Esta ciudad ya existe entre las retiradas. Puedes restaurarla.'
        : 'Esta ciudad ya existe.');
      const id = (await one('SELECT COALESCE(MAX(id),0)+1 AS next FROM city')).next;
      (await run('INSERT INTO city(id,name) VALUES(?,?)', id, change.name));
      (await audit('crear_ciudad', change.name));
      return {id};
    }

    const city = (await one('SELECT name, deleted_at FROM city WHERE id=?', change.id));
    if (!city) throw new Error('Ciudad no encontrada.');
    const hide = change.action === 'hide';
    if (hide !== Boolean(city.deleted_at)) {
      (await run('UPDATE city SET deleted_at=? WHERE id=?', hide ? new Date().toISOString() : null, change.id));
      (await audit(hide ? 'retirar_ciudad' : 'restaurar_ciudad', city.name));
    }
    return {id: change.id};
  }));
}
