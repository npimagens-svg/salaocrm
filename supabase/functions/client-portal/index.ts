// Edge Function: client-portal
//
// API pro portal da cliente (auto-cadastro + login + agendamento online).
// Auth usa Supabase Auth com email sintético derivado do telefone normalizado
// — reusa JWT, refresh token, password recovery do Supabase, sem inventar
// criptografia/sessão custom.
//
// Actions:
//   lookup_match              — busca cliente existente por phone/cpf/email
//   signup                    — cria conta (cliente novo OU vincula existente)
//   login                     — autentica e retorna session
//   me                        — dados do cliente autenticado
//   list_services_online      — serviços com available_online=true
//   list_professionals        — profissionais que atendem service_id
//   list_slots                — slots livres pra data + profissional + serviço
//   create_appointment        — cria agendamento (autenticado)
//   my_appointments           — agendamentos do cliente autenticado
//   cancel_my_appointment     — cancela agendamento próprio

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length < 10) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return d;
}

function syntheticEmail(salonId: string, phoneNorm: string): string {
  const salonShort = salonId.replace(/-/g, "").slice(0, 12);
  return `c_${phoneNorm}_${salonShort}@portal.local`;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SignupBody {
  salon_id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  password: string;
  existing_client_id?: string; // se cliente clicou "vincular ao cadastro existente"
}

interface LoginBody {
  salon_id: string;
  phone: string;
  password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY);

  // Cliente autenticado vai vir com Authorization: Bearer <jwt-do-supabase-auth>
  // Pra essas actions, instanciamos client com o token do header pra validar via getUser().
  async function getAuthedClient(): Promise<{ client: SupabaseClient | null; clientRowId: string | null }> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return { client: null, clientRowId: null };

    const sb = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return { client: null, clientRowId: null };

    const { data: link } = await admin
      .from("client_auth")
      .select("client_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    return { client: sb, clientRowId: link?.client_id ?? null };
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ===== LOOKUP MATCH =====
      case "lookup_match": {
        const { salon_id, phone, cpf, email } = body;
        if (!salon_id) return json({ error: "salon_id required" }, 400);
        const { data, error } = await admin.rpc("lookup_client_match", {
          p_salon_id: salon_id,
          p_phone: phone || null,
          p_cpf: cpf || null,
          p_email: email || null,
        });
        if (error) throw error;
        return json({ match: data?.[0] ?? null });
      }

      // ===== SIGNUP (cliente novo OU vincula existente) =====
      case "signup": {
        const b = body as SignupBody;
        if (!b.salon_id || !b.name || !b.phone || !b.password) {
          return json({ error: "salon_id, name, phone, password are required" }, 400);
        }
        if (b.password.length < 6) {
          return json({ error: "Senha precisa ter pelo menos 6 caracteres" }, 400);
        }

        const phoneNorm = normalizePhone(b.phone);
        if (!phoneNorm) return json({ error: "Telefone inválido" }, 400);

        // 1. Decide se vai criar cliente novo OU vincular existente
        let clientId: string | null = null;
        if (b.existing_client_id) {
          // valida que existe + mesmo salão
          const { data: existing } = await admin
            .from("clients")
            .select("id, salon_id")
            .eq("id", b.existing_client_id)
            .eq("salon_id", b.salon_id)
            .maybeSingle();
          if (!existing) return json({ error: "Cliente não encontrado" }, 404);

          // Tem auth já? bloqueia (pra forçar reset-password em vez de duplicar)
          const { data: existingAuth } = await admin
            .from("client_auth")
            .select("id")
            .eq("client_id", b.existing_client_id)
            .eq("salon_id", b.salon_id)
            .maybeSingle();
          if (existingAuth) {
            return json({
              error: "Já existe conta vinculada a esse cadastro. Use o login ou recupere a senha.",
            }, 409);
          }
          clientId = b.existing_client_id;
        } else {
          // cria novo cliente (sem cair em duplicidade — phone já foi checado no lookup_match no front)
          const { data: created, error: cErr } = await admin
            .from("clients")
            .insert({
              salon_id: b.salon_id,
              name: b.name,
              phone: b.phone,
              email: b.email || null,
              cpf: b.cpf || null,
            })
            .select("id")
            .single();
          if (cErr) throw cErr;
          clientId = created.id;
        }

        // 2. Cria auth.users com email sintético + senha
        const email = syntheticEmail(b.salon_id, phoneNorm);
        const { data: authUser, error: uErr } = await admin.auth.admin.createUser({
          email,
          password: b.password,
          email_confirm: true,
          user_metadata: {
            portal: "client",
            salon_id: b.salon_id,
            client_id: clientId,
            real_phone: b.phone,
            real_email: b.email || null,
          },
        });
        if (uErr) {
          // Se já existe (cliente trocou ideia, tentou de novo) retorna 409
          if (uErr.message?.includes("already")) {
            return json({ error: "Já existe conta com esse telefone neste salão. Faça login." }, 409);
          }
          throw uErr;
        }

        // 3. Cria client_auth (link)
        const { error: linkErr } = await admin.from("client_auth").insert({
          client_id: clientId,
          auth_user_id: authUser.user.id,
          salon_id: b.salon_id,
          last_login_at: new Date().toISOString(),
          email_verified_at: b.email ? null : new Date().toISOString(),
        });
        if (linkErr) throw linkErr;

        // 4. Já loga o cliente (cria session)
        const anon = createClient(SUPABASE_URL, ANON_KEY);
        const { data: session, error: sErr } = await anon.auth.signInWithPassword({
          email,
          password: b.password,
        });
        if (sErr) throw sErr;

        return json({ ok: true, client_id: clientId, session: session.session });
      }

      // ===== LOGIN =====
      case "login": {
        const b = body as LoginBody;
        if (!b.salon_id || !b.phone || !b.password) {
          return json({ error: "salon_id, phone, password are required" }, 400);
        }
        const phoneNorm = normalizePhone(b.phone);
        if (!phoneNorm) return json({ error: "Telefone inválido" }, 400);

        const email = syntheticEmail(b.salon_id, phoneNorm);
        const anon = createClient(SUPABASE_URL, ANON_KEY);
        const { data: session, error: sErr } = await anon.auth.signInWithPassword({
          email,
          password: b.password,
        });
        if (sErr) {
          return json({ error: "Telefone ou senha incorretos" }, 401);
        }

        // Confirma que ainda existe vínculo (cliente não foi deletado)
        const { data: link } = await admin
          .from("client_auth")
          .select("client_id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
        if (!link) {
          return json({ error: "Conta inativa. Contate o salão." }, 403);
        }

        await admin
          .from("client_auth")
          .update({ last_login_at: new Date().toISOString() })
          .eq("auth_user_id", session.user.id);

        return json({ ok: true, client_id: link.client_id, session: session.session });
      }

      // ===== ME =====
      case "me": {
        const { clientRowId } = await getAuthedClient();
        if (!clientRowId) return json({ error: "Não autenticado" }, 401);

        const { data: client } = await admin
          .from("clients")
          .select("id, name, phone, email, cpf, birth_date, salon_id")
          .eq("id", clientRowId)
          .single();
        return json({ client });
      }

      // ===== LIST SERVICES ONLINE =====
      case "list_services_online": {
        const { salon_id } = body;
        if (!salon_id) return json({ error: "salon_id required" }, 400);
        const { data, error } = await admin
          .from("services")
          .select("id, name, description, duration_minutes, price, category")
          .eq("salon_id", salon_id)
          .eq("is_active", true)
          .eq("available_online", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });
        if (error) throw error;
        return json({ services: data ?? [] });
      }

      // ===== LIST PROFESSIONALS FOR SERVICE =====
      case "list_professionals_for_service": {
        const { salon_id, service_id } = body;
        if (!salon_id || !service_id) {
          return json({ error: "salon_id and service_id required" }, 400);
        }

        // Se professional_service_commissions tem rows pra esse serviço, retorna esses.
        // Senão, retorna todos com has_schedule=true (atendem qualquer serviço).
        const { data: specific } = await admin
          .from("professional_service_commissions")
          .select("professional_id")
          .eq("service_id", service_id);

        let q = admin
          .from("professionals")
          .select("id, name, nickname, avatar_url, specialty")
          .eq("salon_id", salon_id)
          .eq("is_active", true)
          .eq("has_schedule", true);

        if (specific && specific.length > 0) {
          q = q.in("id", specific.map((s: any) => s.professional_id));
        }

        const { data, error } = await q.order("name");
        if (error) throw error;
        return json({ professionals: data ?? [] });
      }

      // ===== LIST AVAILABLE SLOTS =====
      case "list_slots": {
        const { salon_id, professional_id, service_id, date } = body;
        if (!salon_id || !professional_id || !service_id || !date) {
          return json({ error: "salon_id, professional_id, service_id, date required" }, 400);
        }

        // Carrega: scheduling_settings (horário do SALÃO) + service.duration + appointments existentes.
        // Regra (decisão Cleiton 28/05): usar horário do SALÃO, não do profissional.
        // Sobreposição com outros agendamentos é OK — só bloqueia se o START_TIME exato
        // bater com outro appointment do mesmo profissional.
        const [
          { data: settings },
          { data: service },
          { data: appts },
        ] = await Promise.all([
          admin.from("scheduling_settings").select("*").eq("salon_id", salon_id).maybeSingle(),
          admin.from("services").select("duration_minutes, available_online, is_active").eq("id", service_id).single(),
          admin
            .from("appointments")
            .select("scheduled_at, status")
            .eq("professional_id", professional_id)
            .gte("scheduled_at", `${date}T00:00:00`)
            .lt("scheduled_at", `${date}T23:59:59`)
            .neq("status", "cancelled"),
        ]);

        if (!service || !service.is_active || !service.available_online) {
          return json({ error: "Serviço não disponível pra agendamento online" }, 400);
        }

        const interval = settings?.slot_interval_minutes ?? 30;
        const duration = service.duration_minutes ?? 30;
        const minAdvanceHrs = settings?.min_advance_hours ?? 0;
        const maxAdvanceDays = settings?.max_advance_days ?? 60;
        const opening = settings?.opening_time ?? "09:00:00";
        const closing = settings?.closing_time ?? "19:00:00";

        // Valida janela
        const now = new Date();
        const target = new Date(`${date}T00:00:00`);
        const minDate = new Date(now.getTime() + minAdvanceHrs * 3600_000);
        const maxDate = new Date(now.getTime() + maxAdvanceDays * 86400_000);
        if (target > maxDate) {
          return json({ slots: [], reason: "Data muito distante" });
        }

        // Salão abre nesse dia?
        const dow = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
          target.getDay()
        ];
        if (settings && settings[dow] === false) {
          return json({ slots: [], reason: "Salão fechado neste dia" });
        }

        // Gera grade de slots dentro do horário de funcionamento DO SALÃO
        const [sh, sm] = String(opening).split(":").map(Number);
        const [eh, em] = String(closing).split(":").map(Number);
        let cur = new Date(target);
        cur.setHours(sh, sm ?? 0, 0, 0);
        const end = new Date(target);
        end.setHours(eh, em ?? 0, 0, 0);

        // Conjunto de horários inicial já ocupados pelo profissional
        const busyStartTimes = new Set(
          (appts ?? []).map((a: any) => {
            const d = new Date(a.scheduled_at);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          }),
        );

        const slots: string[] = [];
        while (cur.getTime() + duration * 60_000 <= end.getTime()) {
          const hhmm = `${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`;
          if (cur >= minDate && !busyStartTimes.has(hhmm)) {
            slots.push(hhmm);
          }
          cur = new Date(cur.getTime() + interval * 60_000);
        }

        return json({ slots: Array.from(new Set(slots)).sort() });
      }

      // ===== CREATE APPOINTMENT =====
      case "create_appointment": {
        const { clientRowId } = await getAuthedClient();
        if (!clientRowId) return json({ error: "Não autenticado" }, 401);

        const { salon_id, professional_id, service_id, scheduled_at, notes } = body;
        if (!salon_id || !professional_id || !service_id || !scheduled_at) {
          return json({ error: "salon_id, professional_id, service_id, scheduled_at required" }, 400);
        }

        const { data: svc } = await admin
          .from("services")
          .select("duration_minutes, price, available_online, is_active")
          .eq("id", service_id)
          .single();
        if (!svc || !svc.is_active || !svc.available_online) {
          return json({ error: "Serviço não disponível pra agendamento online" }, 400);
        }

        const { data: settings } = await admin
          .from("scheduling_settings")
          .select("auto_confirm")
          .eq("salon_id", salon_id)
          .maybeSingle();

        const { data, error } = await admin
          .from("appointments")
          .insert({
            salon_id,
            client_id: clientRowId,
            professional_id,
            service_id,
            scheduled_at,
            duration_minutes: svc.duration_minutes,
            price: svc.price,
            status: settings?.auto_confirm ? "confirmed" : "scheduled",
            notes: notes ?? "Agendamento online pela cliente",
            created_by_name: "portal-cliente",
          })
          .select("id, scheduled_at, status")
          .single();
        if (error) throw error;
        return json({ ok: true, appointment: data });
      }

      // ===== MY APPOINTMENTS =====
      case "my_appointments": {
        const { clientRowId } = await getAuthedClient();
        if (!clientRowId) return json({ error: "Não autenticado" }, 401);

        const { data, error } = await admin
          .from("appointments")
          .select(`
            id, scheduled_at, duration_minutes, status, price, notes,
            services(name, category),
            professionals(name, nickname)
          `)
          .eq("client_id", clientRowId)
          .gte("scheduled_at", new Date(Date.now() - 90 * 86400_000).toISOString())
          .order("scheduled_at", { ascending: false });
        if (error) throw error;
        return json({ appointments: data ?? [] });
      }

      // ===== CANCEL APPOINTMENT (próprio) =====
      case "cancel_my_appointment": {
        const { clientRowId } = await getAuthedClient();
        if (!clientRowId) return json({ error: "Não autenticado" }, 401);

        const { appointment_id, reason } = body;
        if (!appointment_id) return json({ error: "appointment_id required" }, 400);

        // Confirma que é dela
        const { data: appt } = await admin
          .from("appointments")
          .select("client_id, scheduled_at, status")
          .eq("id", appointment_id)
          .maybeSingle();
        if (!appt) return json({ error: "Agendamento não encontrado" }, 404);
        if (appt.client_id !== clientRowId) {
          return json({ error: "Sem permissão" }, 403);
        }
        if (appt.status === "completed" || appt.status === "cancelled") {
          return json({ error: "Não dá pra cancelar agendamento já finalizado/cancelado" }, 400);
        }

        const { error } = await admin
          .from("appointments")
          .update({
            status: "cancelled",
            notes: reason ? `[Cancelado pela cliente] ${reason}` : "[Cancelado pela cliente]",
          })
          .eq("id", appointment_id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({
          error: `Unknown action: ${action}. Available: lookup_match, signup, login, me, list_services_online, list_professionals_for_service, list_slots, create_appointment, my_appointments, cancel_my_appointment`,
        }, 400);
    }
  } catch (err: any) {
    console.error("[client-portal] error:", err);
    return json({ error: err?.message ?? "internal_error" }, 500);
  }
});
