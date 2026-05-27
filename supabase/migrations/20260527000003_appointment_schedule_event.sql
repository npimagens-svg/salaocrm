-- Migration: Trigger Schedule event no Meta CAPI ao criar agendamento
-- Criado em 2026-05-27.
--
-- Cada agendamento criado dispara evento "Schedule" pro Meta via CAPI.
-- Sinaliza estágio mid-funnel (cliente comprometeu horário) pro algoritmo
-- de bidding do Meta otimizar campanhas pra clientes que agendam.

CREATE OR REPLACE FUNCTION public.appointment_after_insert_meta_capi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url     TEXT;
  v_secret  TEXT;
  v_enabled TEXT;
BEGIN
  -- Skip sem cliente vinculado (não tem como atribuir no Meta)
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  SELECT value INTO v_url     FROM public.system_config WHERE key = 'meta_capi_function_url';
  SELECT value INTO v_secret  FROM public.system_config WHERE key = 'meta_capi_trigger_secret';
  SELECT value INTO v_enabled FROM public.system_config WHERE key = 'meta_capi_enabled';

  IF v_url IS NULL OR v_url = '' OR v_enabled IS DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := v_url,
    body := jsonb_build_object(
      'event_name', 'Schedule',
      'appointment_id', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', COALESCE(v_secret, '')
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'appointment_after_insert_meta_capi failed: % %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_meta_capi_schedule ON public.appointments;
CREATE TRIGGER appointment_meta_capi_schedule
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.appointment_after_insert_meta_capi();

COMMENT ON TRIGGER appointment_meta_capi_schedule ON public.appointments IS
  'Dispara Schedule no Meta CAPI quando agendamento é criado com cliente vinculado.';
