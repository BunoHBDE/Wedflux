import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CONCERNS, GOALS, ROLES, SOURCES, STYLES } from '../../src/features/onboarding/options';
import { emptyAnswers, loadAnswers, saveAnswers, type Answers } from '../../src/features/onboarding/store';
import { useCatalog } from '../../src/features/onboarding/useCatalog';
import { useAuth } from '../../src/lib/auth';
import { parseBrDate, todayIso } from '../../src/lib/dates';
import { parseMoney } from '../../src/lib/money';
import { countByCategory, filterPlan } from '../../src/lib/plan';
import { Button, Choice, ErrorText, Field, Loading, colors, s } from '../../src/lib/ui';

type StepId = 'name' | 'welcome' | 'role' | 'source' | 'date' | 'place' | 'guests' | 'budget' | 'concerns'
  | 'hired' | 'style' | 'goals' | 'plan' | 'notifications';
const STEPS: StepId[] = ['name', 'welcome', 'role', 'source', 'date', 'place', 'guests', 'budget', 'concerns', 'hired', 'style', 'goals', 'plan', 'notifications'];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Onboarding() {
  const router = useRouter();
  const { session } = useAuth();
  const catalog = useCatalog();
  const [a, setA] = useState<Answers | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAnswers().then((x) => setA(x.completed ? emptyAnswers : x)); }, []);
  if (!a) return <Loading />;

  const id = STEPS[step];
  const update = (patch: Partial<Answers>) => {
    const next = { ...a, ...patch };
    setA(next);
    saveAnswers(next);
  };

  const dateIso = parseBrDate(a.dateText);
  const budget = parseMoney(a.budget);
  const planItems = a.style && a.destination !== null ? filterPlan(catalog.items, a.style, a.destination) : [];

  function valid(): string | null {
    switch (id) {
      case 'name': return a!.name.trim() ? null : 'Informe seu nome.';
      case 'role': return a!.role ? null : 'Escolha uma opção.';
      case 'source': return a!.source ? null : 'Escolha uma opção.';
      case 'date':
        if (!dateIso) return 'Informe a data no formato DD/MM/AAAA.';
        return dateIso < todayIso() ? 'A data não pode estar no passado.' : null;
      case 'place': return a!.destination === null ? 'Escolha uma opção.' : null;
      case 'guests': return a!.guests === '' || Number(a!.guests) > 0 ? null : 'Número de convidados inválido.';
      case 'budget': return budget === null ? 'Informe o orçamento (pode ser aproximado).' : null;
      case 'hired': return a!.alreadyHired === null ? 'Escolha uma opção.' : null;
      case 'style': return a!.style ? null : 'Escolha um estilo.';
      case 'plan': return catalog.loading ? 'Montando o plano...' : catalog.error;
      default: return null;
    }
  }

  function next() {
    const problem = valid();
    if (problem) return setError(problem);
    setError(null);
    if (step < STEPS.length - 1) return setStep(step + 1);
    finish();
  }

  async function finish() {
    await saveAnswers({ ...a!, completed: true });
    router.replace(session ? '/setup' : '/login');
  }

  async function askNotifications() {
    try { await Notifications.requestPermissionsAsync(); } catch { /* o usuário pode ativar depois em Configurações */ }
    finish();
  }

  const back = () => { setError(null); setStep(Math.max(0, step - 1)); };

  return (
    <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={{ color: colors.muted, marginBottom: 12 }}>Etapa {step + 1} de {STEPS.length}</Text>

      {id === 'name' && (<>
        <Text style={s.title}>Como podemos te chamar?</Text>
        <Field label="Seu nome" value={a.name} onChangeText={(name) => update({ name })} autoCapitalize="words" />
      </>)}

      {id === 'welcome' && (<>
        <Text style={s.title}>Prazer em te conhecer, {a.name.trim() || 'por aqui'}!</Text>
        <Text style={s.sub}>Vamos montar o plano financeiro do seu casamento em poucos passos.</Text>
        <Button title="Tenho um convite" onPress={() => router.replace('/login')} variant="link" />
      </>)}

      {id === 'role' && (<>
        <Text style={s.title}>Quem é você?</Text>
        {ROLES.map((r) => <Choice key={r.value} label={r.label} selected={a.role === r.value} onPress={() => update({ role: r.value })} />)}
      </>)}

      {id === 'source' && (<>
        <Text style={s.title}>Onde você ouviu falar da gente?</Text>
        {SOURCES.map((o) => <Choice key={o} label={o} selected={a.source === o} onPress={() => update({ source: o })} />)}
      </>)}

      {id === 'date' && (<>
        <Text style={s.title}>Quando é o casamento?</Text>
        <Text style={s.sub}>Pode ser uma data aproximada. Ela define os prazos de decisão.</Text>
        <Field label="Data (DD/MM/AAAA)" value={a.dateText} onChangeText={(dateText) => update({ dateText })} keyboardType="numbers-and-punctuation" placeholder="19/06/2027" />
        <Choice label="A data é aproximada" selected={a.dateApproximate} onPress={() => update({ dateApproximate: !a.dateApproximate })} />
      </>)}

      {id === 'place' && (<>
        <Text style={s.title}>Destination wedding ou perto de onde moram?</Text>
        <Choice label="Perto de onde moramos" selected={a.destination === false} onPress={() => update({ destination: false })} />
        <Choice label="Destination wedding" hint="Soma 5 itens ao plano (hospedagem, visita técnica, documentos...)" selected={a.destination === true} onPress={() => update({ destination: true })} />
      </>)}

      {id === 'guests' && (<>
        <Text style={s.title}>Quantos convidados?</Text>
        <Field label="Número de convidados (opcional)" value={a.guests} onChangeText={(guests) => update({ guests: guests.replace(/\D/g, '') })} keyboardType="number-pad" />
      </>)}

      {id === 'budget' && (<>
        <Text style={s.title}>Qual o orçamento total?</Text>
        <Field label="Orçamento (R$)" value={a.budget} onChangeText={(budget) => update({ budget })} keyboardType="decimal-pad" placeholder="50000" />
      </>)}

      {id === 'concerns' && (<>
        <Text style={s.title}>O que mais te preocupa?</Text>
        <Text style={s.sub}>Marque uma ou mais opções.</Text>
        {CONCERNS.map((o) => <Choice key={o} label={o} selected={a.concerns.includes(o)} onPress={() => update({ concerns: toggle(a.concerns, o) })} />)}
      </>)}

      {id === 'hired' && (<>
        <Text style={s.title}>Já contratou algum fornecedor?</Text>
        <Choice label="Sim" selected={a.alreadyHired === true} onPress={() => update({ alreadyHired: true })} />
        <Choice label="Não" selected={a.alreadyHired === false} onPress={() => update({ alreadyHired: false, contractedIds: [] })} />
      </>)}

      {id === 'style' && (<>
        <Text style={s.title}>Como você quer o grande dia?</Text>
        {STYLES.map((o) => <Choice key={o.value} label={o.label} hint={o.hint} selected={a.style === o.value} onPress={() => update({ style: o.value })} />)}
      </>)}

      {id === 'goals' && (<>
        <Text style={s.title}>Como você quer usar o app?</Text>
        <Text style={s.sub}>Marque uma ou mais opções.</Text>
        {GOALS.map((o) => <Choice key={o} label={o} selected={a.goals.includes(o)} onPress={() => update({ goals: toggle(a.goals, o) })} />)}
      </>)}

      {id === 'plan' && (catalog.loading ? <Loading /> : (<>
        <Text style={s.title}>Seu plano está pronto</Text>
        <Text style={s.sub}>{planItems.length} itens em {catalog.categories.length} grupos. Depois do cadastro, você acompanha cada um com valores, parcelas e prazos.</Text>
        {catalog.categories.map((c) => (
          <View key={c.id} style={[s.card, { flexDirection: 'row', justifyContent: 'space-between' }]}>
            <Text>{c.name}</Text>
            <Text style={{ fontWeight: '700' }}>{countByCategory(planItems).get(c.id) ?? 0}</Text>
          </View>
        ))}
        {a.alreadyHired ? (<>
          <Text style={[s.label, { marginTop: 12 }]}>Marque o que você já contratou</Text>
          {planItems.map((i) => (
            <Choice key={i.id} label={i.name} selected={a.contractedIds.includes(i.id)} onPress={() => update({ contractedIds: toggle(a.contractedIds, i.id) })} />
          ))}
        </>) : null}
      </>))}

      {id === 'notifications' && (<>
        <Text style={s.title}>Quer receber lembretes?</Text>
        <Text style={s.sub}>Avisamos às 9h sobre parcelas a vencer e prazos de decisão. Você pode desligar por tipo depois.</Text>
        <Button title="Ativar lembretes" onPress={askNotifications} />
        <Button title="Agora não" onPress={finish} variant="link" />
      </>)}

      <ErrorText>{error}</ErrorText>
      {id !== 'notifications' && id !== 'welcome' ? <Button title={id === 'plan' ? 'Continuar' : 'Próximo'} onPress={next} /> : null}
      {id === 'welcome' ? <Button title="Começar" onPress={next} /> : null}
      {step > 0 ? <Button title="Voltar" onPress={back} variant="link" /> : null}
      {step === 0 ? <Button title="Já tenho conta" onPress={() => router.replace('/login')} variant="link" /> : null}
    </ScrollView>
  );
}
