-- Adiciona configuracoes do programa de fidelidade (cashback) a commission_settings
-- Antes estavam hardcoded: 7%, 15 dias, compra minima R$100
ALTER TABLE public.commission_settings
  ADD COLUMN IF NOT EXISTS loyalty_percent NUMERIC NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS loyalty_validity_days INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS loyalty_min_purchase NUMERIC NOT NULL DEFAULT 100;
