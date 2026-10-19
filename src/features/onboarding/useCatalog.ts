import { useEffect, useState } from 'react';
import type { CatalogItem } from '../../lib/plan';
import { supabase } from '../../lib/supabase';

export type Category = { id: number; name: string; sort_order: number };

/** Catálogo público (legível sem login): usado para montar o plano antes do cadastro. */
export function useCatalog() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; categories: Category[]; items: CatalogItem[] }>({
    loading: true, error: null, categories: [], items: [],
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('catalog_categories').select('id, name, sort_order').order('sort_order'),
      supabase.from('catalog_items').select('id, category_id, name, level, is_essential, destination_only, sort_order').eq('active', true).order('sort_order'),
    ]).then(([c, i]) => {
      if (!alive) return;
      const err = c.error ?? i.error;
      setState({ loading: false, error: err ? err.message : null, categories: c.data ?? [], items: i.data ?? [] });
    });
    return () => { alive = false; };
  }, []);

  return state;
}
