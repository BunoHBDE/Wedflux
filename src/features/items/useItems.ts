import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

export type Item = Database['public']['Tables']['items']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Category = Database['public']['Tables']['catalog_categories']['Row'];

/** Lista de itens do casamento + categorias; recarrega ao voltar para a tela. */
export function useItems() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; items: Item[]; categories: Category[] }>({
    loading: true, error: null, items: [], categories: [],
  });

  const refresh = useCallback(async () => {
    const [i, c] = await Promise.all([
      supabase.from('items').select('*').order('sort_order'),
      supabase.from('catalog_categories').select('*').order('sort_order'),
    ]);
    const err = i.error ?? c.error;
    setState({ loading: false, error: err ? err.message : null, items: i.data ?? [], categories: c.data ?? [] });
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return { ...state, refresh };
}
