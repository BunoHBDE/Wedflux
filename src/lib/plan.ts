import type { WeddingStyle } from '../types/database';

export type CatalogItem = {
  id: number;
  category_id: number;
  name: string;
  level: number;
  is_essential: boolean;
  destination_only: boolean;
  sort_order: number;
};

export const STYLE_LEVEL: Record<WeddingStyle, number> = { so_necessario: 1, minimalista: 2, completo: 3 };

/** Mesma regra de private.generate_plan: nível até o do estilo; destination_only só em destination. */
export function filterPlan<T extends CatalogItem>(items: T[], style: WeddingStyle, destination: boolean): T[] {
  return items.filter((i) => i.level <= STYLE_LEVEL[style] && (!i.destination_only || destination));
}

export function countByCategory(items: CatalogItem[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const i of items) map.set(i.category_id, (map.get(i.category_id) ?? 0) + 1);
  return map;
}
