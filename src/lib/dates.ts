/** "DD/MM/AAAA" -> "AAAA-MM-DD" (null se inválida). */
export function parseBrDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

/** "AAAA-MM-DD" -> "DD/MM/AAAA". */
export function formatBrDate(iso: string | null | undefined): string {
  return iso ? iso.split('-').reverse().join('/') : '';
}

export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Dias de `from` até `iso` (negativo se já passou). */
export function daysUntil(iso: string, from: string = todayIso()): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(iso) - ms(from)) / 86_400_000);
}

/** Soma `k` meses a uma data ISO, limitando o dia ao último do mês (31/01 + 1 = 28/02). */
export function addMonths(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = m - 1 + k;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${year}-${p(month + 1)}-${p(Math.min(d, last))}`;
}
