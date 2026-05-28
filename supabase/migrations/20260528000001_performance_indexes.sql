-- Índices de performance.
-- Antes disso: comandas/appointments faziam varredura completa ao filtrar por
-- client_id (merge de cadastros, comandas por cliente, agendamentos por cliente),
-- e a busca de duplicata por telefone (normalize_phone_br) não tinha índice.

CREATE INDEX IF NOT EXISTS idx_comandas_client_id ON public.comandas(client_id);
CREATE INDEX IF NOT EXISTS idx_comandas_salon_closed ON public.comandas(salon_id, closed_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);

-- Índice funcional pro match de telefone (lookup_client_match usa normalize_phone_br).
CREATE INDEX IF NOT EXISTS idx_clients_phone_norm ON public.clients(public.normalize_phone_br(phone));
