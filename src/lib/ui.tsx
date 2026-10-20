import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = { primary: '#8A4F7D', text: '#222', muted: '#777', border: '#DDD', bg: '#FFF', error: '#B3261E' };

export function Button({ title, onPress, disabled, variant = 'primary' }: {
  title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'link';
}) {
  const link = variant === 'link';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, link && s.link, disabled && { opacity: 0.5 }]}>
      <Text style={[s.btnText, link && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={colors.muted} autoCapitalize="none" {...rest} />
    </View>
  );
}

export const ErrorText = ({ children }: { children?: string | null }) =>
  children ? <Text style={{ color: colors.error, marginBottom: 12 }}>{children}</Text> : null;

export const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
);

export const s = StyleSheet.create({
  screen: { flexGrow: 1, padding: 24, backgroundColor: colors.bg, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub: { color: colors.muted, marginBottom: 20 },
  label: { color: colors.text, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  link: { backgroundColor: 'transparent' },
  btnText: { color: '#FFF', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, marginBottom: 12 },
});

export function Choice({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.card, { marginBottom: 8 }, selected && { borderColor: colors.primary, backgroundColor: '#F6EDF4' }]}
    >
      <Text style={{ fontWeight: '600', color: colors.text }}>{(selected ? '● ' : '○ ') + label}</Text>
      {hint ? <Text style={{ color: colors.muted }}>{hint}</Text> : null}
    </Pressable>
  );
}
