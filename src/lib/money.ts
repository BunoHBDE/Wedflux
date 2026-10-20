/** Converte "1.234,56" (ou "1234.56") em número; null se inválido. */
export function parseMoney(text: string): number | null {
  const t = text.trim().replace(/R\$\s?/, '');
  if (!t) return null;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export function formatBRL(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Divide `total` em `n` partes em centavos; o resto vai para as primeiras parcelas. */
export function splitInstallments(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rest ? 1 : 0)) / 100);
}

/** Diferença (em reais) entre o valor fechado e a soma das parcelas; 0 quando bate. */
export function installmentsGap(contracted: number | null, expected: number[]): number {
  if (contracted == null) return 0;
  const sum = expected.reduce((a, b) => a + Math.round(b * 100), 0);
  return (Math.round(contracted * 100) - sum) / 100;
}
