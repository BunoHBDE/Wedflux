import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { signInWithGoogle } from '../../src/lib/google';
import { supabase } from '../../src/lib/supabase';
import { Button, ErrorText, Field, s } from '../../src/lib/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  const signIn = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    });

  const signUp = () =>
    run(async () => {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session) setInfo('Conta criada. Confirme seu e-mail para entrar.');
    });

  const forgot = () =>
    run(async () => {
      if (!email.trim()) throw new Error('Informe seu e-mail para recuperar a senha.');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setInfo('Enviamos um link para redefinir a senha.');
    });

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Wedflux</Text>
      <Text style={s.sub}>Entre ou crie sua conta para organizar o casamento.</Text>
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <ErrorText>{error}</ErrorText>
      {info ? <Text style={{ marginBottom: 12 }}>{info}</Text> : null}
      <Button title="Entrar" onPress={signIn} disabled={busy || !email || !password} />
      <Button title="Criar conta" onPress={signUp} disabled={busy || !email || password.length < 6} variant="link" />
      <Button title="Entrar com Google" onPress={() => run(signInWithGoogle)} disabled={busy} variant="link" />
      <Button title="Esqueci a senha" onPress={forgot} disabled={busy} variant="link" />
    </ScrollView>
  );
}
