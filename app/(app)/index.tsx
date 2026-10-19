import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { hasActiveSubscription } from '../../src/features/wedding/access';
import { useWedding } from '../../src/features/wedding/useWedding';
import { daysUntil, formatBrDate } from '../../src/lib/dates';
import { formatBRL } from '../../src/lib/money';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Loading, colors, s } from '../../src/lib/ui';
import type { Database } from '../../src/types/database';

type Summary = Database['public']['Views']['wedding_summary']['Row'];
type Upcoming = { id: string; itemName: string; date: string; amount?: number };

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={[s.card, { width: '48%' }]}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{formatBRL(value)}</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { loading, error, wedding, subscription, refresh } = useWedding();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<Upcoming[]>([]);
  const [decisions, setDecisions] = useState<Upcoming[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const weddingId = wedding?.id;
  useFocusEffect(useCallback(() => {
    if (!weddingId) return;
    (async () => {
      const [sum, pay, dec] = await Promise.all([
        supabase.from('wedding_summary').select('*').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('payments').select('id, item_id, due_date, expected_amount').is('paid_at', null).order('due_date').limit(3),
        supabase.from('items').select('id, name, decision_deadline').eq('status', 'a_decidir').eq('is_essential', true)
          .not('decision_deadline', 'is', null).order('decision_deadline').limit(3),
      ]);
      const err = sum.error ?? pay.error ?? dec.error;
      if (err) return setLoadError(err.message);
      setSummary(sum.data);
      const ids = (pay.data ?? []).map((p) => p.item_id);
      const names = new Map<string, string>();
      if (ids.length) {
        const { data } = await supabase.from('items').select('id, name').in('id', ids);
        (data ?? []).forEach((i) => names.set(i.id, i.name));
      }
      setPayments((pay.data ?? []).map((p) => ({ id: p.id, itemName: names.get(p.item_id) ?? 'Item', date: p.due_date, amount: p.expected_amount })));
      setDecisions((dec.data ?? []).map((i) => ({ id: i.id, itemName: i.name, date: i.decision_deadline as string })));
    })();
  }, [weddingId]));

  if (loading) return <Loading />;
  if (!wedding) return <Redirect href="/setup" />;

  const readOnly = !hasActiveSubscription(subscription);
  const left = daysUntil(wedding.wedding_date);

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <ErrorText>{error ?? loadError}</ErrorText>
      <Text style={s.title}>{left >= 0 ? `Faltam ${left} dias` : 'O grande dia já passou'}</Text>
      <Text style={s.sub}>Casamento em {formatBrDate(wedding.wedding_date)}</Text>
      {readOnly ? (
        <View style={s.card}>
          <Text>Sem assinatura ativa: o app fica em somente leitura. A assinatura entra na etapa 4.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Stat label="Contratado" value={summary?.contracted_total ?? 0} />
        <Stat label="Pago" value={summary?.paid_total ?? 0} />
        <Stat label="Falta pagar" value={summary?.remaining_to_pay ?? 0} />
        <Stat label="Orçamento restante" value={summary?.budget_remaining ?? wedding.total_budget} />
      </View>

      <Text style={[s.label, { fontSize: 16 }]}>Próximos vencimentos</Text>
      {payments.length === 0 ? <Text style={s.sub}>Nenhuma parcela a vencer.</Text> : null}
      {payments.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={{ fontWeight: '600' }}>{p.itemName} · {formatBRL(p.amount)}</Text>
          <Text style={{ color: colors.muted }}>{formatBrDate(p.date)}</Text>
        </View>
      ))}

      <Text style={[s.label, { fontSize: 16 }]}>Próximos prazos de decisão</Text>
      {decisions.length === 0 ? <Text style={s.sub}>Nenhum prazo pendente.</Text> : null}
      {decisions.map((d) => (
        <View key={d.id} style={s.card}>
          <Text style={{ fontWeight: '600' }}>{d.itemName}</Text>
          <Text style={{ color: colors.muted }}>Decidir até {formatBrDate(d.date)}</Text>
        </View>
      ))}

      <Button title="Ver todos os itens" onPress={() => router.push('/items')} />
      <Button title="Casal e convite" onPress={() => router.push('/couple')} variant="link" />
      <Button title="Atualizar" onPress={refresh} variant="link" />
      <Button title="Sair" onPress={() => supabase.auth.signOut()} variant="link" />
    </ScrollView>
  );
}
