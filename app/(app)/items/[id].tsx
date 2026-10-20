import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { STATUS_LABEL } from '../../../src/features/items/labels';
import type { Item, Payment } from '../../../src/features/items/useItems';
import { hasActiveSubscription } from '../../../src/features/wedding/access';
import { useWedding } from '../../../src/features/wedding/useWedding';
import { addMonths, formatBrDate, parseBrDate, todayIso } from '../../../src/lib/dates';
import { formatBRL, installmentsGap, parseMoney, splitInstallments } from '../../../src/lib/money';
import { supabase } from '../../../src/lib/supabase';
import { Button, ErrorText, Field, Loading, colors, s } from '../../../src/lib/ui';

const moneyText = (n: number | null) => (n == null ? '' : String(n).replace('.', ','));

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const w = useWedding();
  const [item, setItem] = useState<Item | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // edição do item
  const [supplier, setSupplier] = useState('');
  const [estimated, setEstimated] = useState('');
  const [contracted, setContracted] = useState('');
  const [notes, setNotes] = useState('');
  // parcelas: gerar (entrada + N iguais) e marcar como paga
  const [entry, setEntry] = useState('');
  const [count, setCount] = useState('');
  const [firstDue, setFirstDue] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidDate, setPaidDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      supabase.from('items').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('item_id', id).order('installment_no'),
    ]);
    if (i.error) setError(i.error.message);
    else {
      setItem(i.data);
      setSupplier(i.data.supplier_name ?? '');
      setEstimated(moneyText(i.data.estimated_amount));
      setContracted(moneyText(i.data.contracted_amount));
      setNotes(i.data.notes ?? '');
    }
    setPayments(p.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || w.loading) return <Loading />;
  if (!item || !w.wedding) return <ErrorText>{error ?? 'Item não encontrado.'}</ErrorText>;

  const wedding = w.wedding;
  const canEdit = hasActiveSubscription(w.subscription);
  const nameOf = (uid: string | null) => w.members.find((m) => m.user_id === uid)?.display_name ?? 'Parceiro(a)';
  const gap = installmentsGap(item.contracted_amount, payments.map((p) => p.expected_amount));

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setError(null);
    const { error } = await fn();
    if (error) setError(error.message);
    await load();
  }

  const saveDetails = () => {
    const est = estimated.trim() ? parseMoney(estimated) : null;
    const con = contracted.trim() ? parseMoney(contracted) : null;
    if ((estimated.trim() && est === null) || (contracted.trim() && con === null)) return setError('Valor inválido.');
    return run(() => supabase.from('items').update({
      supplier_name: supplier.trim() || null, estimated_amount: est, contracted_amount: con, notes: notes.trim() || null,
    }).eq('id', item.id));
  };

  const setStatus = (status: 'a_decidir' | 'contratado' | 'nao_se_aplica') =>
    run(() => supabase.from('items').update({ status }).eq('id', item.id));

  async function generate() {
    const total = item!.contracted_amount;
    const n = Number(count);
    const due = parseBrDate(firstDue);
    const ent = entry.trim() ? parseMoney(entry) : 0;
    if (!total || total <= 0) return setError('Informe e salve o valor fechado antes de gerar as parcelas.');
    if (!Number.isInteger(n) || n < 1 || n > 120) return setError('Informe o número de parcelas (1 a 120).');
    if (!due) return setError('Informe o 1º vencimento (DD/MM/AAAA).');
    if (ent === null || ent < 0 || ent >= total) return setError('Entrada inválida.');

    const amounts = splitInstallments(total - ent, n);
    const rows = amounts.map((amount, k) => ({
      item_id: item!.id, wedding_id: wedding.id, installment_no: k + 1, due_date: addMonths(due, k), expected_amount: amount,
    }));
    if (ent > 0) rows.unshift({ item_id: item!.id, wedding_id: wedding.id, installment_no: 0, due_date: due, expected_amount: ent });

    await run(() => supabase.from('payments').insert(rows));
    if (item!.status === 'a_decidir') await setStatus('contratado');
  }

  async function addSingle() {
    const due = parseBrDate(firstDue);
    const amount = parseMoney(entry);
    if (!due || amount === null) return setError('Para uma parcela avulsa, preencha a entrada (valor) e o vencimento.');
    const next = payments.reduce((m, p) => Math.max(m, p.installment_no), 0) + 1;
    await run(() => supabase.from('payments').insert({
      item_id: item!.id, wedding_id: wedding.id, installment_no: next, due_date: due, expected_amount: amount,
    }));
    if (item!.status === 'a_decidir') await setStatus('contratado');
  }

  const openPay = (p: Payment) => {
    setPayingId(p.id);
    setPaidDate(formatBrDate(todayIso()));
    setPaidAmount(moneyText(p.expected_amount));
  };

  const confirmPay = () => {
    const d = parseBrDate(paidDate);
    const amount = parseMoney(paidAmount);
    if (!d || amount === null) return setError('Informe a data (DD/MM/AAAA) e o valor pagos.');
    const pid = payingId!;
    setPayingId(null);
    return run(() => supabase.from('payments').update({ paid_at: d, paid_amount: amount }).eq('id', pid));
  };

  const unpay = (pid: string) => run(() => supabase.from('payments').update({ paid_at: null, paid_amount: null }).eq('id', pid));
  const remove = (pid: string) => run(() => supabase.from('payments').delete().eq('id', pid));

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Button title="‹ Voltar" onPress={() => router.back()} variant="link" />
      <Text style={s.title}>{item.name}</Text>
      <Text style={s.sub}>
        {STATUS_LABEL[item.status]}
        {item.decision_deadline ? ` · decidir até ${formatBrDate(item.decision_deadline)}` : ''}
      </Text>
      {!canEdit ? <View style={s.card}><Text>Somente leitura: o casamento não tem assinatura ativa.</Text></View> : null}
      <ErrorText>{error}</ErrorText>

      {canEdit ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.status === 'a_decidir' ? <Button title="Marcar como contratado" onPress={() => setStatus('contratado')} /> : null}
          {item.status === 'contratado' ? <Button title="Voltar para a decidir" onPress={() => setStatus('a_decidir')} variant="link" /> : null}
          {item.status !== 'nao_se_aplica' && item.status !== 'pago' ? <Button title="Não se aplica" onPress={() => setStatus('nao_se_aplica')} variant="link" /> : null}
          {item.status === 'nao_se_aplica' ? <Button title="Voltar para a decidir" onPress={() => setStatus('a_decidir')} variant="link" /> : null}
        </View>
      ) : null}

      <View style={[s.card, { marginTop: 12 }]}>
        <Field label="Fornecedor" value={supplier} onChangeText={setSupplier} editable={canEdit} autoCapitalize="words" />
        <Field label="Valor estimado (R$)" value={estimated} onChangeText={setEstimated} editable={canEdit} keyboardType="decimal-pad" />
        <Field label="Valor fechado (R$)" value={contracted} onChangeText={setContracted} editable={canEdit} keyboardType="decimal-pad" />
        <Field label="Observações" value={notes} onChangeText={setNotes} editable={canEdit} multiline autoCapitalize="sentences" />
        {canEdit ? <Button title="Salvar" onPress={saveDetails} /> : null}
      </View>

      <Text style={[s.label, { fontSize: 16, marginTop: 8 }]}>Parcelas</Text>
      {gap !== 0 && payments.length > 0 ? (
        <Text style={{ color: colors.error, marginBottom: 8 }}>
          Atenção: a soma das parcelas {gap > 0 ? `está ${formatBRL(gap)} abaixo` : `está ${formatBRL(-gap)} acima`} do valor fechado.
        </Text>
      ) : null}
      {payments.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={{ fontWeight: '600' }}>{p.installment_no === 0 ? 'Entrada' : `Parcela ${p.installment_no}`} · {formatBRL(p.expected_amount)}</Text>
          <Text style={{ color: colors.muted }}>Vence em {formatBrDate(p.due_date)}</Text>
          {p.paid_at ? (
            <Text style={{ color: colors.primary }}>Paga em {formatBrDate(p.paid_at)} · {formatBRL(p.paid_amount)}</Text>
          ) : null}
          <Text style={{ color: colors.muted }}>Registrado por {nameOf(p.updated_by ?? p.created_by)}</Text>
          {canEdit ? (
            payingId === p.id ? (
              <>
                <Field label="Data do pagamento" value={paidDate} onChangeText={setPaidDate} keyboardType="numbers-and-punctuation" />
                <Field label="Valor pago (R$)" value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" />
                <Button title="Confirmar pagamento" onPress={confirmPay} />
                <Button title="Cancelar" onPress={() => setPayingId(null)} variant="link" />
              </>
            ) : (
              <>
                {p.paid_at ? <Button title="Desfazer pagamento" onPress={() => unpay(p.id)} variant="link" /> : <Button title="Marcar como paga" onPress={() => openPay(p)} variant="link" />}
                <Button title="Excluir" onPress={() => remove(p.id)} variant="link" />
              </>
            )
          ) : null}
        </View>
      ))}
      {payments.length === 0 ? <Text style={s.sub}>Nenhuma parcela cadastrada.</Text> : null}

      {canEdit ? (
        <View style={s.card}>
          <Text style={s.label}>Adicionar parcelas</Text>
          <Field label="Entrada / valor da parcela avulsa (R$, opcional)" value={entry} onChangeText={setEntry} keyboardType="decimal-pad" />
          <Field label="Número de parcelas iguais" value={count} onChangeText={(t) => setCount(t.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Field label="1º vencimento (DD/MM/AAAA)" value={firstDue} onChangeText={setFirstDue} keyboardType="numbers-and-punctuation" />
          <Button title="Gerar entrada + parcelas" onPress={generate} disabled={payments.length > 0} />
          <Button title="Adicionar uma parcela avulsa" onPress={addSingle} variant="link" />
        </View>
      ) : null}
    </ScrollView>
  );
}
