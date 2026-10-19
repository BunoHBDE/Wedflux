import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMonths, daysUntil, formatBrDate, parseBrDate } from './dates.ts';
import { installmentsGap, parseMoney, splitInstallments } from './money.ts';
import { filterPlan, type CatalogItem } from './plan.ts';

test('parseMoney', () => {
  assert.equal(parseMoney('1.234,56'), 1234.56);
  assert.equal(parseMoney('R$ 50000'), 50000);
  assert.equal(parseMoney('10,5'), 10.5);
  assert.equal(parseMoney('abc'), null);
  assert.equal(parseMoney(''), null);
});

test('splitInstallments soma exatamente o total', () => {
  assert.deepEqual(splitInstallments(100, 3), [33.34, 33.33, 33.33]);
  assert.equal(splitInstallments(1000, 7).reduce((a, b) => a + Math.round(b * 100), 0), 100000);
  assert.deepEqual(splitInstallments(10, 0), []);
});

test('installmentsGap', () => {
  assert.equal(installmentsGap(1000, [500, 500]), 0);
  assert.equal(installmentsGap(1000, [500, 400]), 100);
  assert.equal(installmentsGap(null, [1]), 0);
});

test('datas', () => {
  assert.equal(parseBrDate('19/06/2027'), '2027-06-19');
  assert.equal(parseBrDate('31/02/2027'), null);
  assert.equal(formatBrDate('2027-06-19'), '19/06/2027');
  assert.equal(daysUntil('2027-06-19', '2026-10-19'), 243);
  assert.equal(addMonths('2027-01-31', 1), '2027-02-28');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
  assert.equal(addMonths('2026-12-10', 1), '2027-01-10');
});

test('filterPlan reproduz as contagens do catálogo (20/34/49, +5 destination)', () => {
  // Distribuição do seed: nível 1 = 25 (5 destination), nível 2 = 14, nível 3 = 15.
  const mk = (n: number, level: number, dest: boolean): CatalogItem[] =>
    Array.from({ length: n }, (_, i) => ({
      id: level * 100 + i + (dest ? 50 : 0), category_id: 1, name: 'x', level,
      is_essential: false, destination_only: dest, sort_order: 0,
    }));
  const all = [...mk(20, 1, false), ...mk(5, 1, true), ...mk(14, 2, false), ...mk(15, 3, false)];
  assert.equal(filterPlan(all, 'so_necessario', false).length, 20);
  assert.equal(filterPlan(all, 'minimalista', false).length, 34);
  assert.equal(filterPlan(all, 'completo', false).length, 49);
  assert.equal(filterPlan(all, 'completo', true).length, 54);
});
