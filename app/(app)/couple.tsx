import { useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useWedding } from '../../src/features/wedding/useWedding';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Loading, colors, s } from '../../src/lib/ui';

export default function Couple() {
  const { session } = useAuth();
  const { loading, role, members, refresh } = useWedding();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Loading />;

  const isOwner = role === 'owner';

  async function invite() {
    setError(null);
    const { data, error } = await supabase.rpc('create_invite');
    if (error) return setError(error.message);
    setCode(data);
  }

  async function remove(userId: string) {
    setError(null);
    const { error } = await supabase.from('wedding_members').delete().eq('user_id', userId);
    if (error) return setError(error.message);
    await refresh();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={s.title}>Casal</Text>
      {members.map((m) => (
        <View key={m.user_id} style={s.card}>
          <Text style={{ fontWeight: '600' }}>
            {m.display_name ?? 'Sem nome'}{m.user_id === session?.user.id ? ' (você)' : ''}
          </Text>
          <Text style={{ color: colors.muted }}>{m.role === 'owner' ? 'Dono(a) do casamento' : 'Parceiro(a)'}</Text>
          {isOwner && m.role === 'partner' ? <Button title="Remover" onPress={() => remove(m.user_id)} variant="link" /> : null}
        </View>
      ))}
      <ErrorText>{error}</ErrorText>
      {isOwner && members.length < 2 ? (
        <>
          <Button title="Convidar parceiro(a)" onPress={invite} />
          {code ? (
            <View style={[s.card, { marginTop: 12 }]}>
              <Text style={{ color: colors.muted }}>Código (uso único, vale por 7 dias):</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: 2 }} selectable>{code}</Text>
              <Button title="Compartilhar" onPress={() => Share.share({ message: `Entre no nosso casamento no Wedflux com o código ${code}` })} variant="link" />
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
