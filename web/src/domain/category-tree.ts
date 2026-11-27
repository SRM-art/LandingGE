export const categoryLevels = ['Categoría', 'Subcategoría', 'Criterio'] as const;

export interface Category {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  position: number;
  deleted_at: string | null;
}

export function categoryPath(categories: Category[], id: number | null): Category[] {
  const path: Category[] = [];
  while (id !== null) {
    const current = categories.find(category => category.id === id);
    if (!current) break;
    path.unshift(current);
    id = current.parent_id;
  }
  return path;
}

export function orderedCategories<T extends Category>(categories: T[], parentId: number | null = null): T[] {
  return categories.filter(category => category.parent_id === parentId)
    .flatMap(category => [category, ...orderedCategories(categories, category.id)]);
}

export function categoryHeight(categories: Category[], id: number): number {
  return 1 + Math.max(0, ...categories.filter(category => category.parent_id === id)
    .map(category => categoryHeight(categories, category.id)));
}
