import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PartnerRole, WeddingStyle } from '../../types/database';

const KEY = 'wedflux.onboarding.v1';

/** Respostas do onboarding. Ficam no aparelho até o login (depois vão para create_wedding). */
export type Answers = {
  name: string;
  role: PartnerRole | null;
  source: string | null;
  dateText: string; // DD/MM/AAAA como digitado
  dateApproximate: boolean;
  destination: boolean | null;
  guests: string;
  budget: string;
  concerns: string[];
  alreadyHired: boolean | null;
  style: WeddingStyle | null;
  goals: string[];
  contractedIds: number[];
  completed: boolean;
};

export const emptyAnswers: Answers = {
  name: '', role: null, source: null, dateText: '', dateApproximate: false, destination: null,
  guests: '', budget: '', concerns: [], alreadyHired: null, style: null, goals: [],
  contractedIds: [], completed: false,
};

export async function loadAnswers(): Promise<Answers> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyAnswers, ...JSON.parse(raw) } : emptyAnswers;
  } catch {
    return emptyAnswers;
  }
}

export async function saveAnswers(a: Answers): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(a));
}

export async function clearAnswers(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
