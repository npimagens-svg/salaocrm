/**
 * Migrations incrementais do schema do cliente.
 *
 * Como funciona:
 * - Cada migration tem uma versao (numero crescente) e statements SQL.
 * - system_config guarda a key "schema_version" com o ultimo valor aplicado.
 * - Salao novo (wizard): roda setupSchemaSQL.ts inteiro e marca schema_version = LATEST.
 * - Salao ja instalado: o SchemaUpdateCard compara versao local vs LATEST e oferece aplicar.
 *
 * Regras para adicionar uma migration:
 * 1. Incrementa LATEST_SCHEMA_VERSION.
 * 2. Adiciona objeto no fim do array SCHEMA_MIGRATIONS.
 * 3. Usa sempre "IF NOT EXISTS" / "IF EXISTS" para ser idempotente.
 * 4. NAO edita migrations antigas — sempre adiciona nova.
 */

export interface SchemaMigration {
  version: number;
  name: string;
  description: string;
  statements: string[];
}

export const LATEST_SCHEMA_VERSION = 3;

export const SCHEMA_MIGRATIONS: SchemaMigration[] = [
  {
    version: 2,
    name: "Programa de fidelidade configuravel",
    description: "Adiciona loyalty_percent, loyalty_validity_days e loyalty_min_purchase em commission_settings para o cashback ficar editavel.",
    statements: [
      `ALTER TABLE public.commission_settings ADD COLUMN IF NOT EXISTS loyalty_percent NUMERIC NOT NULL DEFAULT 7;`,
      `ALTER TABLE public.commission_settings ADD COLUMN IF NOT EXISTS loyalty_validity_days INTEGER NOT NULL DEFAULT 15;`,
      `ALTER TABLE public.commission_settings ADD COLUMN IF NOT EXISTS loyalty_min_purchase NUMERIC NOT NULL DEFAULT 100;`,
    ],
  },
  {
    version: 3,
    name: "Auditoria de criacao de agendamentos",
    description: "Adiciona coluna created_by_name em appointments para registrar quem criou cada agendamento. Exibido no hover card da agenda.",
    statements: [
      `ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by_name TEXT;`,
    ],
  },
];

export function pendingMigrations(currentVersion: number): SchemaMigration[] {
  return SCHEMA_MIGRATIONS.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);
}
