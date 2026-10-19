import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useWedding } from '../../src/features/wedding/useWedding';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Field, Loading, colors, s } from '../../src/lib/ui';
import type { WeddingStyle } from '../../src/types/database';

const STYLES: { value: WeddingStyle; label: string }[] = [
  { value: 'so_necessario', label: 'Só o necessário' },
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'completo', label: 'Completo' },
];

// "DD/MM/AAAA" -> "AAAA-MM-DD" (null se inválida)
function parseBrDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

export default function Setup() {
  const router = useRouter();
  const { loading, wedding, refresh } = useWedding();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState<WeddingStyle>('completo');
  const [destination, setDestination] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (wedding) return <Redirect href="/" />;

  async function submit(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setError(error.message);
    await refresh();
    router.replace('/');
  }

  const create = () => {
    const iso = parseBrDate(date);
    const total = Number(budget.replace(/\./g, '').replace(',', '.') || '0');
    if (!iso) return setError('Informe a data no formato DD/MM/AAAA.');
    if (Number.isNaN(total) || total < 0) return setError('Orçamento inválido.');
    return submit(() =>
      supabase.rpc('create_wedding', {
        p_wedding_date: iso,
        p_style: style,
        p_is_destination: destination,
        p_total_budget: total,
        p_display_name: name.trim() || undefined,
      }),
    );
  };

  const join = () => submit(() => supabase.rpc('accept_invite', { p_code: code }));

  if (mode === 'choose') {
    return (
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.title}>Vamos começar</Text>
        <Text style={s.sub}>Crie o casamento ou entre no do seu parceiro(a) com um código.</Text>
        <Button title="Criar meu casamento" onPress={() => setMode('create')} />
        <Button title="Tenho um convite" onPress={() => setMode('join')} variant="link" />
        <Button title="Sair" onPress={() => supabase.auth.signOut()} variant="link" />
      </ScrollView>
    );
  }

  if (mode === 'join') {
    return (
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Tenho um convite</Text>
        <Field label="Código do convite" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCorrect={false} />
        <ErrorText>{error}</ErrorText>
        <Button title="Entrar no casamento" onPress={join} disabled={busy || code.trim().length === 0} />
        <Button title="Voltar" onPress={() => setMode('choose')} variant="link" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Seu casamento</Text>
      <Field label="Seu nome" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Data (DD/MM/AAAA)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="19/06/2027" />
      <Field label="Orçamento total (R$)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="50000" />
      <Text style={s.label}>Estilo</Text>
      <View style={{ marginBottom: 12 }}>
        {STYLES.map((o) => (
          <Button key={o.value} title={(style === o.value ? '● ' : '○ ') + o.label} onPress={() => setStyle(o.value)} variant="link" />
        ))}
      </View>
      <Button
        title={(destination ? '☑ ' : '☐ ') + 'Destination wedding'}
        onPress={() => setDestination((v) => !v)}
        variant="link"
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Gerar meu plano" onPress={create} disabled={busy} />
      <Button title="Voltar" onPress={() => setMode('choose')} variant="link" />
      <Text style={{ color: colors.muted, marginTop: 12 }}>O onboarding completo (16 etapas) entra na etapa 2.</Text>
    </ScrollView>
  );
}
