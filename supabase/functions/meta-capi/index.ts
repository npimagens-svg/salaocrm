// Edge Function: meta-capi
//
// Envia eventos server-side pro Meta Conversions API (CAPI).
// Chamada pelos triggers Postgres em `comandas` (InitiateCheckout no insert,
// Purchase no UPDATE quando closed_at vira NOT NULL).
//
// Dedup: event_id = comanda.id (Purchase) ou comanda.id + '_ic' (InitiateCheckout).
// Se Pixel client-side rodar com mesmo event_id, Meta dedupa automaticamente.
//
// Match Quality: envia external_id (hash phone), ph (hash phone), em (hash email)
// e fbp/fbc/ctwa_clid se houver client_attribution.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v22.0";

interface CapiRequest {
  event_name: "Purchase" | "InitiateCheckout" | "Schedule";
  comanda_id?: string;
  appointment_id?: string;
}

// SHA256 lowercase hex — padrão de hashing exigido pelo Meta.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normaliza telefone BR: só dígitos, com DDI 55, sem 9º dígito duplicado.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (!digits.startsWith("55")) digits = "55" + digits;
  return digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: CapiRequest = await req.json();
    const { event_name, comanda_id, appointment_id } = body;

    if (!event_name || (!comanda_id && !appointment_id)) {
      return new Response(
        JSON.stringify({ error: "event_name + (comanda_id ou appointment_id) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Carrega config Meta
    const { data: configRows } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", [
        "meta_pixel_id",
        "meta_capi_token",
        "meta_capi_enabled",
        "meta_capi_test_event_code",
        "meta_capi_trigger_secret",
      ]);

    const config = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]));

    // Auth leve: trigger_secret no header bate com system_config.
    // Permite que botão de "Testar" da UI também chame com a mesma key,
    // ou que humano teste via curl colando o secret.
    const expectedSecret = config.meta_capi_trigger_secret;
    const providedSecret = req.headers.get("x-trigger-secret") ?? "";
    if (expectedSecret && providedSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid x-trigger-secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (config.meta_capi_enabled !== "true") {
      return new Response(
        JSON.stringify({ skipped: "meta_capi_enabled=false" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pixelId = config.meta_pixel_id;
    const token = config.meta_capi_token;
    const testEventCode = config.meta_capi_test_event_code || null;

    if (!pixelId || !token) {
      return new Response(
        JSON.stringify({ error: "Pixel ID ou Token não configurados em system_config" }),
        { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Carrega entidade (comanda ou appointment) + cliente + itens.
    // Normaliza tudo num "entity" comum: { id, salon_id, client_id, total, event_time }
    let entity: any = null;
    let items: any[] = [];
    if (appointment_id) {
      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .select("id, salon_id, client_id, service_id, price, scheduled_at, created_at, status")
        .eq("id", appointment_id)
        .maybeSingle();
      if (apptErr || !appt) {
        return new Response(
          JSON.stringify({ error: "Appointment não encontrado", details: apptErr }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      entity = {
        id: appt.id,
        salon_id: appt.salon_id,
        client_id: appt.client_id,
        total: appt.price ?? 0,
        event_time_iso: appt.scheduled_at ?? appt.created_at,
      };
      // 1 item virtual = o serviço agendado
      if (appt.service_id) {
        const { data: svc } = await supabase
          .from("services")
          .select("name, price")
          .eq("id", appt.service_id)
          .maybeSingle();
        if (svc) {
          items = [{
            description: svc.name,
            total_price: svc.price,
            item_type: "service",
            service_id: appt.service_id,
            product_id: null,
          }];
        }
      }
    } else {
      const { data: comanda, error: comandaErr } = await supabase
        .from("comandas")
        .select("id, salon_id, client_id, total, subtotal, discount, is_paid, closed_at, created_at")
        .eq("id", comanda_id)
        .maybeSingle();

      if (comandaErr || !comanda) {
        return new Response(
          JSON.stringify({ error: "Comanda não encontrada", details: comandaErr }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      entity = {
        id: comanda.id,
        salon_id: comanda.salon_id,
        client_id: comanda.client_id,
        total: comanda.total,
        event_time_iso: event_name === "Purchase" ? comanda.closed_at : comanda.created_at,
      };
      const { data: itemRows } = await supabase
        .from("comanda_items")
        .select("description, total_price, item_type, service_id, product_id")
        .eq("comanda_id", comanda_id);
      items = itemRows ?? [];
    }

    // event_id: id da entidade + sufixo por evento (Schedule, _ic, Purchase puro)
    const suffix =
      event_name === "Purchase" ? "" :
      event_name === "InitiateCheckout" ? "_ic" :
      event_name === "Schedule" ? "_sch" : `_${event_name.toLowerCase()}`;
    const eventId = `${entity.id}${suffix}`;

    // 3. Dedup: já enviou com sucesso? skipa.
    const { data: prevSuccess } = await supabase
      .from("ads_events_log")
      .select("id")
      .eq("platform", "meta")
      .eq("event_id", eventId)
      .eq("succeeded", true)
      .maybeSingle();

    if (prevSuccess) {
      return new Response(
        JSON.stringify({ skipped: "already_sent", event_id: eventId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Cliente + atribuição (Match Quality máxima: puxa TODOS os campos PII)
    let client: any = null;
    let attribution: any = null;
    if (entity.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("id, name, email, phone, cpf, gender, birth_date, cep, city, state")
        .eq("id", entity.client_id)
        .maybeSingle();
      client = c;

      const { data: a } = await supabase
        .from("client_attribution")
        .select("fbp, fbc, ctwa_clid, fbclid")
        .eq("client_id", entity.client_id)
        .maybeSingle();
      attribution = a;
    }

    // 5. Itens (já carregados acima — comanda_items ou item virtual do appointment)

    // 6. Monta user_data com PII hasheada — Meta Advanced Matching
    // Tudo SHA256 lowercase. Quanto mais campos, melhor Match Quality.
    const user_data: Record<string, any> = {};
    const phoneNormalized = normalizePhone(client?.phone);

    // external_id: CPF é melhor que phone (Meta cruza com base WhatsApp BR
    // pelo CPF do cadastro). Fallback pra phone se não tiver CPF.
    const cpfDigits = (client?.cpf ?? "").replace(/\D/g, "");
    if (cpfDigits.length === 11) {
      user_data.external_id = [await sha256Hex(cpfDigits)];
    } else if (phoneNormalized) {
      user_data.external_id = [await sha256Hex(phoneNormalized)];
    }

    if (phoneNormalized) {
      user_data.ph = [await sha256Hex(phoneNormalized)];
    }
    if (client?.email) {
      user_data.em = [await sha256Hex(client.email)];
    }
    if (client?.name) {
      const parts = client.name.trim().toLowerCase().split(/\s+/);
      if (parts.length >= 1) user_data.fn = [await sha256Hex(parts[0])];
      if (parts.length >= 2) user_data.ln = [await sha256Hex(parts[parts.length - 1])];
    }
    if (client?.gender) {
      // Meta espera "m" ou "f" lowercase
      const g = client.gender.trim().toLowerCase()[0];
      if (g === "m" || g === "f") user_data.ge = [await sha256Hex(g)];
    }
    if (client?.birth_date) {
      // Meta espera YYYYMMDD
      const db = String(client.birth_date).slice(0, 10).replace(/-/g, "");
      if (db.length === 8) user_data.db = [await sha256Hex(db)];
    }
    if (client?.city) {
      // Meta: city lowercase, sem espaço, sem acento, sem pontuação
      const ct = client.city
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (ct) user_data.ct = [await sha256Hex(ct)];
    }
    if (client?.state) {
      const st = client.state.trim().toLowerCase().slice(0, 2);
      if (st.length === 2) user_data.st = [await sha256Hex(st)];
    }
    if (client?.cep) {
      const zp = client.cep.replace(/\D/g, "").slice(0, 8);
      if (zp.length >= 5) user_data.zp = [await sha256Hex(zp)];
    }
    // Country fixo Brasil
    user_data.country = [await sha256Hex("br")];

    // Atribuição (não hasheia — vão como texto puro)
    if (attribution?.fbp) user_data.fbp = attribution.fbp;
    if (attribution?.fbc) user_data.fbc = attribution.fbc;
    if (attribution?.ctwa_clid) {
      user_data.ctwa_clid = attribution.ctwa_clid;
    }

    // 7. Custom data
    const value = Number(entity.total) || 0;
    const contentNames = (items ?? []).map((i: any) => i.description).filter(Boolean);
    const contentIds = (items ?? [])
      .map((i: any) => i.service_id || i.product_id)
      .filter(Boolean) as string[];

    const custom_data: Record<string, any> = { currency: "BRL", value };
    if (contentNames.length > 0) custom_data.content_name = contentNames.join(", ");
    if (contentIds.length > 0) {
      custom_data.content_ids = contentIds;
      custom_data.content_type = "product";
    }
    // Schedule sinaliza estágio de funil — Meta usa pra otimização
    if (event_name === "Schedule") custom_data.lead_event_source = "sistemanp";

    // 8. event_time da entidade
    const event_time = Math.floor(new Date(entity.event_time_iso ?? Date.now()).getTime() / 1000);

    const event = {
      event_name,
      event_time,
      event_id: eventId,
      action_source: "physical_store",
      user_data,
      custom_data,
    };

    const payload: Record<string, any> = { data: [event] };
    if (testEventCode) payload.test_event_code = testEventCode;

    // 9. POST Meta CAPI
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const metaJson = await metaRes.json().catch(() => ({}));
    const httpStatus = metaRes.status;
    const succeeded = httpStatus >= 200 && httpStatus < 300;

    // 10. Log
    await supabase.from("ads_events_log").insert({
      salon_id: entity.salon_id,
      comanda_id: comanda_id ?? null,
      client_id: entity.client_id,
      platform: "meta",
      event_name,
      event_id: eventId,
      event_time: new Date(event_time * 1000).toISOString(),
      value,
      currency: "BRL",
      payload,
      response: metaJson,
      http_status: httpStatus,
      error_message: succeeded ? null : (metaJson?.error?.message ?? `HTTP ${httpStatus}`),
      succeeded,
    });

    return new Response(
      JSON.stringify({
        ok: succeeded,
        event_id: eventId,
        http_status: httpStatus,
        meta_response: metaJson,
      }),
      {
        status: succeeded ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[meta-capi] error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
