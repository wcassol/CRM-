# Supabase — CRM Jurídico

## Migrations

| Arquivo | Descrição |
|---|---|
| `00001_initial_schema.sql` | Enums, tabelas principais, relacionamentos |
| `00002_indexes.sql` | Índices de performance + busca full-text |
| `00003_rls_policies.sql` | Row Level Security + políticas por perfil |
| `00004_triggers_functions.sql` | Triggers, automações e funções SQL |
| `00005_seed_data.sql` | Dados iniciais (roles, origens, motivos de perda) |
| `00006_storage_views.sql` | Buckets de storage + views úteis |

## Como aplicar

### Desenvolvimento local
```bash
supabase start
supabase db reset   # aplica todas as migrations + seed
```

### Produção (primeira vez)
```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### Nova migration
```bash
supabase migration new nome_da_migration
# edita o arquivo gerado
supabase db push
```

## Gerar tipos TypeScript
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

## Storage Buckets necessários
- `documentos-clientes` — privado, documentos dos leads
- `avatares-usuarios` — público, fotos de perfil
