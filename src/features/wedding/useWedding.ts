import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Database, MemberRole } from '../../types/database';

export type Wedding = Database['public']['Tables']['weddings']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export type WeddingState = {
  loading: boolean;
  error: string | null;
  wedding: Wedding | null;
  role: MemberRole | null;
  subscription: Subscription | null;
  members: { user_id: string; role: MemberRole; display_name: string | null }[];
  refresh: () => Promise<void>;
};

/** Carrega o casamento do usuário logado (a RLS garante que só vem o dele). */
export function useWedding(): WeddingState {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<Omit<WeddingState, 'refresh'>>({
    loading: true,
    error: null,
    wedding: null,
    role: null,
    subscription: null,
    members: [],
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data: membership, error: mErr } = await supabase
      .from('wedding_members')
      .select('wedding_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    if (mErr) return setState((s) => ({ ...s, loading: false, error: mErr.message }));
    if (!membership) {
      return setState({ loading: false, error: null, wedding: null, role: null, subscription: null, members: [] });
    }

    const [w, sub, mem] = await Promise.all([
      supabase.from('weddings').select('*').eq('id', membership.wedding_id).single(),
      supabase.from('subscriptions').select('*').eq('wedding_id', membership.wedding_id).maybeSingle(),
      supabase.from('wedding_members').select('user_id, role').eq('wedding_id', membership.wedding_id),
    ]);
    const err = w.error ?? sub.error ?? mem.error;
    if (err) return setState((s) => ({ ...s, loading: false, error: err.message }));

    const ids = (mem.data ?? []).map((m) => m.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', ids);
    const names = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

    setState({
      loading: false,
      error: null,
      wedding: w.data,
      role: membership.role,
      subscription: sub.data,
      members: (mem.data ?? []).map((m) => ({ ...m, display_name: names.get(m.user_id) ?? null })),
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
