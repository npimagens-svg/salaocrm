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

export const LATEST_SCHEMA_VERSION = 7;

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
  {
    version: 4,
    name: "Cashback opcional por padrao",
    description: "Adiciona loyalty_default_enabled em commission_settings. Por padrao cashback vem desmarcado na comanda; toggle em Marketing > Fidelidade ativa por padrao.",
    statements: [
      `ALTER TABLE public.commission_settings ADD COLUMN IF NOT EXISTS loyalty_default_enabled BOOLEAN NOT NULL DEFAULT false;`,
    ],
  },
  {
    version: 5,
    name: "FKs em cascade + CHECKs positivos",
    description: "Deletar comanda agora apaga credits/debts/balance ligados (antes virava orfao). CHECK garante credit_amount>0 e debt_amount>0.",
    statements: [
      `ALTER TABLE public.client_credits DROP CONSTRAINT IF EXISTS client_credits_comanda_id_fkey;`,
      `ALTER TABLE public.client_credits ADD CONSTRAINT client_credits_comanda_id_fkey FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;`,
      `ALTER TABLE public.client_debts DROP CONSTRAINT IF EXISTS client_debts_comanda_id_fkey;`,
      `ALTER TABLE public.client_debts ADD CONSTRAINT client_debts_comanda_id_fkey FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;`,
      `ALTER TABLE public.client_balance DROP CONSTRAINT IF EXISTS client_balance_comanda_id_fkey;`,
      `ALTER TABLE public.client_balance ADD CONSTRAINT client_balance_comanda_id_fkey FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;`,
      `ALTER TABLE public.client_credits DROP CONSTRAINT IF EXISTS client_credits_amount_positive;`,
      `ALTER TABLE public.client_credits ADD CONSTRAINT client_credits_amount_positive CHECK (credit_amount > 0);`,
      `ALTER TABLE public.client_debts DROP CONSTRAINT IF EXISTS client_debts_amount_positive;`,
      `ALTER TABLE public.client_debts ADD CONSTRAINT client_debts_amount_positive CHECK (debt_amount > 0);`,
    ],
  },
  {
    version: 6,
    name: "Custo de produto vendido separado do serviço",
    description: "Adiciona product_sale_deduct_cost em commission_settings. Quando false, comissão de produto vendido (shampoo, condicionador) não desconta o custo — apenas taxa de cartão. Independente do toggle global de taxa de produto.",
    statements: [
      `ALTER TABLE public.commission_settings ADD COLUMN IF NOT EXISTS product_sale_deduct_cost BOOLEAN NOT NULL DEFAULT true;`,
    ],
  },
  {
    version: 7,
    name: "Ajustes manuais na comissão (bônus e descontos)",
    description: "Cria a tabela commission_adjustments para registrar bônus (+) e descontos (-) que entram no total da comissão do profissional no período, fora do fluxo da comanda.",
    statements: [
      `CREATE TABLE IF NOT EXISTS public.commission_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
        professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
        adjustment_date DATE NOT NULL,
        adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus','discount')),
        amount NUMERIC NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL DEFAULT '',
        created_by_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS idx_commission_adjustments_professional_date ON public.commission_adjustments (professional_id, adjustment_date);`,
      `CREATE INDEX IF NOT EXISTS idx_commission_adjustments_salon_date ON public.commission_adjustments (salon_id, adjustment_date);`,
      `ALTER TABLE public.commission_adjustments ENABLE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS "Users can view commission_adjustments in their salon" ON public.commission_adjustments;`,
      `CREATE POLICY "Users can view commission_adjustments in their salon" ON public.commission_adjustments FOR SELECT USING (salon_id IN (SELECT salon_id FROM public.profiles WHERE user_id = auth.uid()));`,
      `DROP POLICY IF EXISTS "Users can insert commission_adjustments in their salon" ON public.commission_adjustments;`,
      `CREATE POLICY "Users can insert commission_adjustments in their salon" ON public.commission_adjustments FOR INSERT WITH CHECK (salon_id IN (SELECT salon_id FROM public.profiles WHERE user_id = auth.uid()));`,
      `DROP POLICY IF EXISTS "Users can delete commission_adjustments in their salon" ON public.commission_adjustments;`,
      `CREATE POLICY "Users can delete commission_adjustments in their salon" ON public.commission_adjustments FOR DELETE USING (salon_id IN (SELECT salon_id FROM public.profiles WHERE user_id = auth.uid()));`,
    ],
  },
];

export function pendingMigrations(currentVersion: number): SchemaMigration[] {
  return SCHEMA_MIGRATIONS.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);
}
