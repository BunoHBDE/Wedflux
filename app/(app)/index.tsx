import { Redirect, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useWedding } from '../../src/features/wedding/useWedding';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Loading, s } from '../../src/lib/ui';

function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export default function Home() {
  const router = useRouter();
  const { loading, error, wedding, subscription } = useWedding();

  if (loading) return <Loading />;
  if (!wedding) return <Redirect href="/setup" />;

  const readOnly =
    !subscription || subscription.status === 'expired' ||
    !subscription.entitlement_expires_at || new Date(subscription.entitlement_expires_at) <= new Date();

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <ErrorText>{error}</ErrorText>
      <Text style={s.title}>Faltam {daysUntil(wedding.wedding_date)} dias</Text>
      <Text style={s.sub}>Casamento em {wedding.wedding_date.split('-').reverse().join('/')}</Text>
      {readOnly ? (
        <View style={s.card}>
          <Text>Sem assinatura ativa: o app fica em somente leitura. A assinatura chega na etapa 4.</Text>
        </View>
      ) : null}
      <Button title="Casal e convite" onPress={() => router.push('/couple')} />
      <Button title="Sair" onPress={() => supabase.auth.signOut()} variant="link" />
    </ScrollView>
  );
}
