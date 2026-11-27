import { CatalogError } from '../domain/catalog-error.ts';
import { z } from 'zod';
import { categoryHeight, categoryLevels, categoryPath } from '../domain/category-tree.ts';
import { slugify } from '../domain/pricing.ts';
import { all, audit, categories, one, run, transaction } from './db.ts';

export interface CategoryProduct {
  id: string;
  name: string;
  sku: string;
  state: 'draft' | 'published';
  deleted_at: string | null;
}

export async function categoryUsage(branchId: number | null = null, limit = -1): Promise<Map<number, CategoryProduct[]>> {
  const rows: (CategoryProduct & {branch_id: number})[] = (await all(`WITH RECURSIVE branches(branch_id, category_id) AS (
    SELECT id, id FROM category WHERE deleted_at IS NULL AND (? IS NULL OR id = ?)
    UNION ALL
    SELECT branches.branch_id, child.id FROM branches JOIN category child ON child.parent_id = branches.category_id
    WHERE child.deleted_at IS NULL
  ) SELECT branch_id, p.id, p.name, p.sku, p.state, p.deleted_at
    FROM branches JOIN product p ON p.category_id = branches.category_id
    ORDER BY branch_id, p.name COLLATE NOCASE, p.id LIMIT ?`, branchId, branchId, limit));
  const usage = new Map<number, CategoryProduct[]>();
  for (const {branch_id, ...product} of rows) {
    const branch = usage.get(branch_id) ?? [];
    branch.push(product);
    usage.set(branch_id, branch);
  }
  return usage;
}

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const fields = {
  name: z.string().transform(value => value.trim().replace(/\s+/gu, ' ').normalize('NFC'))
    .pipe(z.string().min(2, 'Escribe al menos dos caracteres.').max(80)),
  parent_id: id.nullable(),
  position: z.number().int().min(0).max(9999),
};
const input = z.discriminatedUnion('action', [
  z.object({action: z.literal('create'), ...fields}),
  z.object({action: z.literal('edit'), id, ...fields}),
  z.object({action: z.enum(['hide', 'restore']), id}),
]);

export async function manageCategory(payload: unknown) {
  const change = input.parse(payload);
  return (await transaction(async () => {
    const rows = (await categories(true));
    const current = 'id' in change ? rows.find(row => row.id === change.id) : undefined;
    if ('id' in change && !current) throw new CatalogError('La clasificación no existe.');

    if (change.action === 'create' || change.action === 'edit') {
      if (current?.deleted_at) throw new CatalogError('Restaura la clasificación antes de editarla.');
      const parentPath = categoryPath(rows, change.parent_id);
      if (change.parent_id !== null && (!parentPath.length || parentPath.some(row => row.deleted_at))) {
        throw new CatalogError('Selecciona una clasificación superior activa.');
      }
      if (current && parentPath.some(row => row.id === current.id)) {
        throw new CatalogError('Una clasificación no puede depender de sí misma ni de una de sus ramas.');
      }
      const branchHeight = current ? categoryHeight(rows, current.id) : 1;
      if (parentPath.length + branchHeight > categoryLevels.length) {
        throw new CatalogError('El catálogo admite tres niveles: categoría, subcategoría y criterio.');
      }
      const collator = new Intl.Collator('es-CO', {sensitivity: 'base'});
      const duplicate = rows.find(row => row.id !== current?.id && row.parent_id === change.parent_id
        && collator.compare(row.name, change.name) === 0);
      if (duplicate) throw new CatalogError(duplicate.deleted_at
        ? 'Ese nombre ya existe en esta rama. Puedes restaurar la clasificación retirada.'
        : 'Ese nombre ya existe en esta rama.');

      if (current) {
        (await run('UPDATE category SET name=?,parent_id=?,position=? WHERE id=?', change.name, change.parent_id, change.position, current.id));
        (await audit('editar_categoria', change.name));
        return {id: current.id};
      }
      const baseCode = slugify(change.name) || 'categoria';
      let code = baseCode;
      for (let suffix = 2; rows.some(row => row.code === code); suffix++) code = `${baseCode}-${suffix}`;
      const group = (await one('SELECT group_code FROM category WHERE id=?', change.parent_id))?.group_code ?? 'complementos';
      const id = (await one('SELECT COALESCE(MAX(id),0)+1 AS next FROM category')).next;
      (await run('INSERT INTO category(id,code,name,parent_id,position,group_code) VALUES(?,?,?,?,?,?)',
        id, code, change.name, change.parent_id, change.position, group));
      (await audit('crear_categoria', change.name));
      return {id};
    }

    if (!current) throw new CatalogError('La clasificación no existe.');
    const hide = change.action === 'hide';
    if (hide === Boolean(current.deleted_at)) return {id: current.id};
    if (hide) {
      if ((await categoryUsage(current.id, 1)).has(current.id)) {
        throw new CatalogError('No se puede retirar esta clasificación porque está en uso. Reasigna los productos vinculados en el árbol del catálogo.');
      }
      if (rows.some(row => row.parent_id === current.id && !row.deleted_at)) {
        throw new CatalogError('Mueve o retira primero las ramas que dependen de esta clasificación.');
      }
    } else if (categoryPath(rows, current.parent_id).some(row => row.deleted_at)) {
      throw new CatalogError('Restaura primero la clasificación superior.');
    }
    (await run('UPDATE category SET deleted_at=? WHERE id=?', hide ? new Date().toISOString() : null, current.id));
    (await audit(hide ? 'retirar_categoria' : 'restaurar_categoria', current.name));
    return {id: current.id};
  }));
}
