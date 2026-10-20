import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { clearAnswers, loadAnswers } from '../../src/features/onboarding/store';
import { useWedding } from '../../src/features/wedding/useWedding';
import { parseBrDate } from '../../src/lib/dates';
import { parseMoney } from '../../src/lib/money';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Field, Loading, s } from '../../src/lib/ui';

/**
 * Pós-login sem casamento:
 *  - se há respostas do onboarding no aparelho, cria o casamento (create_wedding) e limpa o rascunho;
 *  - senão, mostra "Tenho um convite" (accept_invite) ou volta ao onboarding.
 */
export default function Setup() {
  const router = useRouter();
  const { loading, wedding, refresh } = useWedding();
  const [phase, setPhase] = useState<'checking' | 'creating' | 'choose'>('checking');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (loading || wedding || started.current) return;
    started.current = true;
    (async () => {
      const a = await loadAnswers();
      const iso = parseBrDate(a.dateText);
      if (!a.completed || !iso || !a.style || a.destination === null) return setPhase('choose');

      setPhase('creating');
      const { error } = await supabase.rpc('create_wedding', {
        p_wedding_date: iso,
        p_style: a.style,
        p_is_destination: a.destination,
        p_total_budget: parseMoney(a.budget) ?? 0,
        p_guest_count: a.guests ? Number(a.guests) : undefined,
        p_date_is_approximate: a.dateApproximate,
        p_concerns: a.concerns,
        p_usage_goals: a.goals,
        p_already_hired: a.alreadyHired ?? false,
        p_contracted_catalog_item_ids: a.contractedIds,
        p_display_name: a.name.trim() || undefined,
        p_role: a.role ?? undefined,
        p_acquisition_source: a.source ?? undefined,
      });
      if (error) {
        setError(error.message);
        return setPhase('choose');
      }
      await clearAnswers();
      await refresh();
      router.replace('/');
    })();
  }, [loading, wedding, refresh, router]);

  if (loading || phase !== 'choose') return <Loading />;
  if (wedding) return <Redirect href="/" />;

  async function join() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('accept_invite', { p_code: code });
    setBusy(false);
    if (error) return setError(error.message);
    await refresh();
    router.replace('/');
  }

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Entrar no casamento</Text>
      <Text style={s.sub}>Digite o código que seu parceiro(a) enviou.</Text>
      <Field label="Código do convite" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCorrect={false} />
      <ErrorText>{error}</ErrorText>
      <Button title="Entrar no casamento" onPress={join} disabled={busy || code.trim().length === 0} />
      <Button title="Criar meu casamento" onPress={() => router.replace('/onboarding')} variant="link" />
      <Button title="Sair" onPress={() => supabase.auth.signOut()} variant="link" />
    </ScrollView>
  );
}
