# 04 — Catálogo e prazos

Fontes: `anexos/02_seed_catalogo.sql` (aplicado) e `anexos/catalogo-itens-v2.xlsx`. Os 54 itens **não** são copiados aqui.

## Estrutura
Tabelas `catalog_categories` (8) e `catalog_items` (54). Cada item: categoria, nome, nível (1–3), essencial, `destination_only`, `lead_months` (meses antes; negativo = depois), observação, ordem. Legível sem login.

| Categoria | Itens |
| --- | --- |
| 1 Planejamento e documentos | 9 |
| 2 Cerimônia e música | 5 |
| 3 Festa e decoração | 10 |
| 4 Foto e vídeo | 4 |
| 5 Convidados e convites | 6 |
| 6 Viagens e hospedagem | 8 |
| 7 Noivos e beleza | 6 |
| 8 Extras e festas do casal | 6 |

Por nível: 25 de nível 1, 14 de nível 2, 15 de nível 3.

## Itens por estilo (contagens conferidas no seed)
| Estilo | Nível máx. | Sem destination | Com destination | Essenciais (sem / com dest.) |
| --- | --- | --- | --- | --- |
| Só o necessário | 1 | 20 | 25 | 19 / 20 |
| Minimalista | 2 | 34 | 39 | 23 / 24 |
| Completo | 3 | 49 | 54 | 23 / 24 |

Destination soma 5 itens: hospedagem dos convidados, visita técnica, passagens e documentos dos noivos, hospedagem/deslocamento dos fornecedores e documentação no exterior. Civil e religioso aparecem para todos (o casal marca "não se aplica").

## Os 24 essenciais (checklist)
Prazo padrão em meses antes do casamento:

- **12:** Reserva para imprevistos
- **10:** Cerimonialista; Local da cerimônia; Celebrante; Espaço da recepção; Buffet; Fotógrafo; Música/DJ da cerimônia; Banda/DJ da festa; Visita técnica (só destination)
- **7:** Casamento civil; Casamento religioso; Vestido de noiva
- **4:** Decoração e flores; Convites; Traje do noivo; Transporte dos convidados; Lua de mel
- **2:** Buquê; Acessórios da noiva; Alianças; Cabelo e maquiagem; Carro dos noivos; Lembrancinhas

Cada casal vê de 19 a 24, conforme estilo e destination (a visita técnica só existe em destination).

## Ajuste dos prazos
```
prazo ajustado = prazo padrão × min(1, meses disponíveis / 12)
```
Prazo negativo (depois do casamento) não é encurtado. No SQL (`private.compute_deadline`): mês = 30,4375 dias; `deadline = data − round(meses_ajustados × 30,4375)` dias; dias disponíveis negativos viram 0. Como o prazo padrão máximo é 12, o resultado nunca cai antes de hoje.

**Exemplo 1** — hoje 19/10/2026, casamento 19/06/2027 (243 dias ≈ 7,98 meses), item de 10 meses:
fator = 243 / 30,4375 / 12 ≈ 0,6653; meses ajustados ≈ 6,65; 6,65 × 30,4375 ≈ 202,5 dias, que o `round` do Postgres arredonda para 203 → prazo **28/11/2026** (40 dias a partir de hoje, ~1,3 mês). Bate com o exemplo do escopo (8 meses → 6,7 meses antes).

**Exemplo 2** — mesmo casamento, item de 2 meses: 2 × 0,6653 × 30,4375 ≈ 40,5 dias → arredonda para 41 → prazo **09/05/2027**.

Ambos conferidos executando `private.compute_deadline(data, meses, '2026-10-19')` no banco aplicado (somente leitura). Atenção: o arredondamento é "meio para cima" (numeric do Postgres); um cálculo em ponto flutuante ou com arredondamento bancário (Python `round`) erra 1 dia nesses dois casos. O app não deve recalcular prazos no cliente: usar o valor do banco.

Casos-limite (também conferidos no banco): casamento em 19/10/2027 (365 dias) e item de 10 meses → 19/12/2026, o prazo padrão cheio. Item de −1 mês (casamento 19/06/2027) → 19/07/2027, sem encurtar. Casamento em 19/01/2027 e item de 12 meses → 19/10/2026 (hoje), nunca no passado.

## Origem dos prazos
Estrutura da agenda de tarefas de um site de casamentos usado como referência (fim de cada janela: "10 a 12 meses" vira 10). Só a estrutura; nomes e textos são próprios.
