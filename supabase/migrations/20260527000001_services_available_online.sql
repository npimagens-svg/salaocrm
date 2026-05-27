-- Migration: flag de disponibilidade pra agendamento online
-- Criado em 2026-05-27.
--
-- Cliente que se cadastra no portal público de agendamento (Fase B) só pode
-- agendar serviços marcados como disponíveis online. Serviços complexos
-- (mecha, química, procedimentos que pedem avaliação prévia) ficam
-- desmarcados — só pela recepção.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS available_online BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_services_available_online
  ON public.services(salon_id, available_online)
  WHERE available_online = true;

COMMENT ON COLUMN public.services.available_online IS
  'Quando true, aparece no portal público de agendamento online da cliente. Default false (precisa ser ativado serviço por serviço).';
