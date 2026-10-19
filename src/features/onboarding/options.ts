import type { PartnerRole, WeddingStyle } from '../../types/database';

export const ROLES: { value: PartnerRole; label: string }[] = [
  { value: 'noiva', label: 'Noiva' },
  { value: 'noivo', label: 'Noivo' },
  { value: 'outro', label: 'Outro(a)' },
];

export const SOURCES = ['Instagram', 'TikTok', 'Google', 'Indicação de amigos', 'Indicação do sítio/espaço', 'Outro'];

// Opções de múltipla escolha: textos provisórios (o escopo não lista as opções) — ver docs/questoes-em-aberto.md
export const CONCERNS = ['Estourar o orçamento', 'Esquecer prazos', 'Controlar as parcelas', 'Organizar os fornecedores', 'Dividir tudo com meu parceiro(a)'];
export const GOALS = ['Controlar gastos', 'Acompanhar parcelas', 'Lembrar de prazos', 'Guardar contratos', 'Planejar a dois'];

export const STYLES: { value: WeddingStyle; label: string; hint: string }[] = [
  { value: 'completo', label: 'Completo', hint: 'Até 49 itens' },
  { value: 'minimalista', label: 'Minimalista', hint: 'Até 34 itens' },
  { value: 'so_necessario', label: 'Só o necessário', hint: 'Até 20 itens' },
];
