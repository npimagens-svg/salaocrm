-- Migration: Auth do Portal Cliente (auto-cadastro + agendamento online)
-- Criado em 2026-05-27.
--
-- Cliente do salão (não usuário do sistema) faz auto-cadastro pelo portal
-- público pra agendar serviços online. Auth usa o próprio Supabase Auth
-- (auth.users) com email sintético derivado do telefone normalizado —
-- assim reusamos JWT, refresh token, password recovery do Supabase.
--
-- Vínculo entre auth.users e public.clients fica em client_auth.

-- ============================================================================
-- 0. Helper normalize_phone_br (necessário pra portal cliente — pode já existir
--    de outras migrations, por isso usamos CREATE OR REPLACE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_phone_br(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL THEN RETURN NULL; END IF;
  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_digits) < 10 THEN RETURN NULL; END IF;
  IF substring(v_digits, 1, 2) <> '55' THEN
    v_digits := '55' || v_digits;
  END IF;
  RETURN v_digits;
END;
$$;

-- ============================================================================
-- 1. Tabela client_auth — link auth.users ↔ clients
-- ============================================================================

CREATE TABLE public.client_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id),
  UNIQUE(client_id, salon_id)
);

CREATE INDEX idx_client_auth_client ON public.client_auth(client_id);
CREATE INDEX idx_client_auth_authuser ON public.client_auth(auth_user_id);
CREATE INDEX idx_client_auth_salon ON public.client_auth(salon_id);

CREATE TRIGGER client_auth_updated_at
  BEFORE UPDATE ON public.client_auth
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_auth_self_read"
  ON public.client_auth FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- ============================================================================
-- 2. RPC lookup_client_match — busca match seguro (sem expor PII)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lookup_client_match(
  p_salon_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  name_masked TEXT,
  has_auth BOOLEAN,
  matched_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_phone_norm TEXT;
  v_cpf_digits TEXT;
  v_email_lower TEXT;
BEGIN
  v_phone_norm := public.normalize_phone_br(p_phone);
  v_cpf_digits := CASE WHEN p_cpf IS NOT NULL AND p_cpf != '' THEN regexp_replace(p_cpf, '[^0-9]', '', 'g') END;
  v_email_lower := CASE WHEN p_email IS NOT NULL AND p_email != '' THEN lower(trim(p_email)) END;

  IF v_phone_norm IS NULL AND v_cpf_digits IS NULL AND v_email_lower IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS client_id,
    CASE
      WHEN length(c.name) >= 4
        THEN substring(c.name, 1, 2) || repeat('*', greatest(length(c.name) - 4, 1)) || substring(c.name from length(c.name) - 1)
      ELSE substring(c.name, 1, 1) || '***'
    END AS name_masked,
    EXISTS(
      SELECT 1 FROM public.client_auth ca
      WHERE ca.client_id = c.id AND ca.salon_id = p_salon_id
    ) AS has_auth,
    CASE
      WHEN v_phone_norm IS NOT NULL AND public.normalize_phone_br(c.phone) = v_phone_norm THEN 'phone'
      WHEN v_cpf_digits IS NOT NULL AND regexp_replace(COALESCE(c.cpf, ''), '[^0-9]', '', 'g') = v_cpf_digits THEN 'cpf'
      WHEN v_email_lower IS NOT NULL AND lower(c.email) = v_email_lower THEN 'email'
      ELSE NULL
    END AS matched_by
  FROM public.clients c
  WHERE c.salon_id = p_salon_id
    AND (
      (v_phone_norm IS NOT NULL AND public.normalize_phone_br(c.phone) = v_phone_norm)
      OR (v_cpf_digits IS NOT NULL AND v_cpf_digits != '' AND regexp_replace(COALESCE(c.cpf, ''), '[^0-9]', '', 'g') = v_cpf_digits)
      OR (v_email_lower IS NOT NULL AND lower(c.email) = v_email_lower)
    )
  ORDER BY
    CASE
      WHEN v_phone_norm IS NOT NULL AND public.normalize_phone_br(c.phone) = v_phone_norm THEN 1
      WHEN v_cpf_digits IS NOT NULL AND regexp_replace(COALESCE(c.cpf, ''), '[^0-9]', '', 'g') = v_cpf_digits THEN 2
      ELSE 3
    END
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_client_match(UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- ============================================================================
-- 3. Helper current_portal_client_id + RLS policies portal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_portal_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT client_id FROM public.client_auth WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_portal_client_id() TO authenticated;

CREATE POLICY "clients_portal_self_read"
  ON public.clients FOR SELECT
  TO authenticated
  USING (id = public.current_portal_client_id());

CREATE POLICY "clients_portal_self_update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (id = public.current_portal_client_id())
  WITH CHECK (id = public.current_portal_client_id());

CREATE POLICY "appointments_portal_self_read"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (client_id = public.current_portal_client_id());

COMMENT ON TABLE public.client_auth IS
  'Liga auth.users (Supabase Auth) ↔ public.clients pro portal cliente. 1 cliente pode ter 1 auth por salão.';

COMMENT ON FUNCTION public.lookup_client_match IS
  'Busca cliente existente por phone/cpf/email antes do auto-cadastro. Retorna nome mascarado pra confirmação visual.';

COMMENT ON FUNCTION public.current_portal_client_id IS
  'Retorna o client_id vinculado ao JWT atual. Usado em RLS policies pra portal cliente ler dados próprios.';
