-- Adiciona coluna para registrar quem criou o agendamento (auditoria).
-- Exibida no hover do agendamento na agenda.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by_name TEXT;
