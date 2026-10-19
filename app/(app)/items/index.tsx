import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { hasActiveSubscription } from '../../../src/features/wedding/access';
import { useWedding } from '../../../src/features/wedding/useWedding';
import { STATUS_LABEL } from '../../../src/features/items/labels';
import { useItems } from '../../../src/features/items/useItems';
import { formatBRL } from '../../../src/lib/money';
import { supabase } from '../../../src/lib/supabase';
import { Button, Choice, ErrorText, Field, Loading, colors, s } from '../../../src/lib/ui';
import type { ItemStatus } from '../../../src/types/database';

const FILTERS: (ItemStatus | 'todos')[] = ['todos', 'a_decidir', 'contratado', 'pago', 'nao_se_aplica'];

export default function Items() {
  const router = useRouter();
  const wedding = useWedding();
  const { loading, error, items, categories, refresh } = useItems();
  const [filter, setFilter] = useState<ItemStatus | 'todos'>('todos');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading || wedding.loading) return <Loading />;
  const canEdit = hasActiveSubscription(wedding.subscription);

  async function add() {
    if (!wedding.wedding || categoryId === null || !name.trim()) return setFormError('Informe o nome e a categoria.');
    setFormError(null);
    const { error } = await supabase.from('items').insert({
      wedding_id: wedding.wedding.id, category_id: categoryId, name: name.trim(),
    });
    if (error) return setFormError(error.message);
    setName(''); setCategoryId(null); setAdding(false);
    refresh();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={s.title}>Itens</Text>
      <ErrorText>{error}</ErrorText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.card, { marginRight: 8, padding: 8 }, filter === f && { borderColor: colors.primary }]}>
            <Text>{f === 'todos' ? 'Todos' : STATUS_LABEL[f]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {canEdit ? <Button title={adding ? 'Cancelar' : 'Adicionar item'} onPress={() => setAdding(!adding)} variant="link" /> : null}
      {adding ? (
        <View style={s.card}>
          <Field label="Nome do item" value={name} onChangeText={setName} autoCapitalize="sentences" />
          <Text style={s.label}>Categoria</Text>
          {categories.map((c) => <Choice key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
          <ErrorText>{formError}</ErrorText>
          <Button title="Salvar item" onPress={add} />
        </View>
      ) : null}

      {categories.map((c) => {
        const rows = items.filter((i) => i.category_id === c.id && (filter === 'todos' || i.status === filter));
        if (rows.length === 0) return null;
        return (
          <View key={c.id} style={{ marginBottom: 16 }}>
            <Text style={[s.label, { fontSize: 16 }]}>{c.name}</Text>
            {rows.map((i) => (
              <Pressable key={i.id} style={s.card} onPress={() => router.push({ pathname: '/items/[id]', params: { id: i.id } })}>
                <Text style={{ fontWeight: '600' }}>{i.name}</Text>
                <Text style={{ color: colors.muted }}>
                  {STATUS_LABEL[i.status]}{i.contracted_amount != null ? ` · ${formatBRL(i.contracted_amount)}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {items.length === 0 ? <Text style={s.sub}>Nenhum item ainda.</Text> : null}
    </ScrollView>
  );
}
