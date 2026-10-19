# Supabase — Wedflux

Projeto `wedflux` (ref `nhfujhpteolhndsyqsys`, us-west-2). O banco **já está aplicado**; as migrações abaixo refletem o que está lá.

## Organização

| Migração | Conteúdo |
| --- | --- |
| `migrations/20261019000001_schema.sql` | Enums, 12 tabelas, funções (`private` e RPCs `public`), gatilhos, RLS, privilégios, bucket `contratos`, índices |
| `migrations/20261019000002_seed_catalogo.sql` | 8 categorias e 54 itens do catálogo |

- Schema `private`: funções auxiliares (`is_member`, `can_edit`, `compute_deadline`, `generate_plan`...), não expostas pela API.
- Schema `public`: tabelas com RLS e as RPCs que o app chama.
- Diferenças em relação aos anexos em `docs/anexos/`: dois índices extras (`items_category_idx`, `items_catalog_idx`) e a política `attachments_delete` usa `private.can_edit(wedding_id)` (igual ao banco aplicado). Ver `docs/questoes-em-aberto.md`.

## Aplicar migrações (Supabase CLI)

```bash
supabase login
supabase link --project-ref nhfujhpteolhndsyqsys
supabase db push            # aplica migrações novas no projeto remoto
supabase db reset           # banco local limpo com todas as migrações (precisa de Docker)
```

Nova mudança: `supabase migration new <nome>`, editar o arquivo gerado, testar local com `supabase db reset` e só então `supabase db push`.
**Não rode `db push` hoje com as duas migrações acima**: o remoto já as contém. Antes do primeiro push, registre-as como aplicadas com `supabase migration repair --status applied 20261019000001 20261019000002`.

## Regra de ouro

Nunca edite o banco pelo painel sem gerar uma migração correspondente neste diretório. Quem altera o banco "na mão" deixa o repositório mentindo.
Toda tabela nova nasce com RLS ligada e políticas; privilégios mínimos (`revoke all` e `grant` por coluna).
