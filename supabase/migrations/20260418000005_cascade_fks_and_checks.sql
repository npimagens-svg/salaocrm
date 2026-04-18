-- Previne cashback/divida/saldo "fantasma" quando uma comanda eh deletada.
-- Antes a FK era ON DELETE SET NULL — comanda apagada deixava registros orfaos
-- que apareciam como credito/divida sem origem nos clientes.
-- Agora eh CASCADE: apagar comanda apaga registros financeiros ligados a ela.

ALTER TABLE public.client_credits DROP CONSTRAINT IF EXISTS client_credits_comanda_id_fkey;
ALTER TABLE public.client_credits ADD CONSTRAINT client_credits_comanda_id_fkey
  FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;

ALTER TABLE public.client_debts DROP CONSTRAINT IF EXISTS client_debts_comanda_id_fkey;
ALTER TABLE public.client_debts ADD CONSTRAINT client_debts_comanda_id_fkey
  FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;

ALTER TABLE public.client_balance DROP CONSTRAINT IF EXISTS client_balance_comanda_id_fkey;
ALTER TABLE public.client_balance ADD CONSTRAINT client_balance_comanda_id_fkey
  FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;

-- CHECKs: valores sempre positivos
ALTER TABLE public.client_credits DROP CONSTRAINT IF EXISTS client_credits_amount_positive;
ALTER TABLE public.client_credits ADD CONSTRAINT client_credits_amount_positive CHECK (credit_amount > 0);

ALTER TABLE public.client_debts DROP CONSTRAINT IF EXISTS client_debts_amount_positive;
ALTER TABLE public.client_debts ADD CONSTRAINT client_debts_amount_positive CHECK (debt_amount > 0);
