-- Toggle global do cashback: por padrao INATIVO.
-- Usuario ativa em Marketing -> Fidelidade para todas as novas comandas
-- virem com o checkbox marcado automaticamente.
ALTER TABLE public.commission_settings
  ADD COLUMN IF NOT EXISTS loyalty_default_enabled BOOLEAN NOT NULL DEFAULT false;
