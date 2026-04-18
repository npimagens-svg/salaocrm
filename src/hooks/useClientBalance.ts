import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ClientBalanceEntry {
  id: string;
  salon_id: string;
  client_id: string;
  type: "credit" | "debt";
  amount: number;
  description: string | null;
  comanda_id: string | null;
  created_by: string | null;
  created_at: string;
  creator?: {
    full_name: string;
  } | null;
}

export interface ClientBalanceSummary {
  totalCredits: number;
  totalDebts: number;
  netBalance: number;
}

export function useClientBalance(clientId: string | null) {
  const { salonId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["client_balance", clientId, salonId],
    queryFn: async () => {
      if (!clientId || !salonId) return [];
      const { data, error } = await supabase
        .from("client_balance")
        .select("*")
        .eq("salon_id", salonId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientBalanceEntry[];
    },
    enabled: !!clientId && !!salonId,
  });

  const entries = query.data ?? [];

  const summary: ClientBalanceSummary = entries.reduce(
    (acc, entry) => {
      const amount = Number(entry.amount);
      if (entry.type === "credit") {
        acc.totalCredits += amount;
      } else {
        acc.totalDebts += amount;
      }
      acc.netBalance = acc.totalCredits - acc.totalDebts;
      return acc;
    },
    { totalCredits: 0, totalDebts: 0, netBalance: 0 } as ClientBalanceSummary
  );

  const addCreditMutation = useMutation({
    mutationFn: async ({ amount, description, comandaId }: { amount: number; description?: string; comandaId?: string }) => {
      if (!salonId || !clientId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase
        .from("client_balance")
        .insert({
          salon_id: salonId,
          client_id: clientId,
          type: "credit",
          amount,
          description: description || "Crédito manual",
          comanda_id: comandaId || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_balance", clientId, salonId] });
      queryClient.invalidateQueries({ queryKey: ["client_net_balance", clientId, salonId] });
      toast({ title: "Crédito adicionado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar crédito", description: error.message, variant: "destructive" });
    },
  });

  const addDebtMutation = useMutation({
    mutationFn: async ({ amount, description, comandaId }: { amount: number; description?: string; comandaId?: string }) => {
      if (!salonId || !clientId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase
        .from("client_balance")
        .insert({
          salon_id: salonId,
          client_id: clientId,
          type: "debt",
          amount,
          description: description || "Dívida registrada",
          comanda_id: comandaId || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_balance", clientId, salonId] });
      queryClient.invalidateQueries({ queryKey: ["client_net_balance", clientId, salonId] });
      toast({ title: "Dívida registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar dívida", description: error.message, variant: "destructive" });
    },
  });

  return {
    entries,
    summary,
    isLoading: query.isLoading,
    error: query.error,
    addCredit: addCreditMutation.mutate,
    addDebt: addDebtMutation.mutate,
    isAddingCredit: addCreditMutation.isPending,
    isAddingDebt: addDebtMutation.isPending,
  };
}

/**
 * Retorna o saldo liquido do cliente (credito - divida).
 * Considera TRES fontes:
 * 1. client_balance: lancamentos manuais (credit/debt)
 * 2. client_debts: dividas de comandas fechadas com saldo faltante (is_paid=false)
 * 3. client_credits: cashback gerado automaticamente (is_used=false, is_expired=false, nao vencido)
 *
 * Valor negativo = cliente deve. Positivo = cliente tem credito.
 */
export function useClientNetBalance(clientId: string | null) {
  const { salonId } = useAuth();

  const query = useQuery({
    queryKey: ["client_net_balance", clientId, salonId],
    queryFn: async () => {
      if (!clientId || !salonId) return { credits: 0, debts: 0 };

      const [balanceRes, debtsRes, creditsRes] = await Promise.all([
        supabase
          .from("client_balance")
          .select("type, amount")
          .eq("salon_id", salonId)
          .eq("client_id", clientId),
        supabase
          .from("client_debts" as any)
          .select("debt_amount")
          .eq("salon_id", salonId)
          .eq("client_id", clientId)
          .eq("is_paid", false),
        supabase
          .from("client_credits")
          .select("credit_amount, expires_at")
          .eq("salon_id", salonId)
          .eq("client_id", clientId)
          .eq("is_used", false)
          .eq("is_expired", false),
      ]);

      let credits = 0;
      let debts = 0;

      // client_balance: lancamentos manuais
      for (const e of (balanceRes.data || [])) {
        const amount = Number((e as any).amount);
        if ((e as any).type === "credit") credits += amount;
        else debts += amount;
      }

      // client_debts: dividas nao pagas
      for (const d of (debtsRes.data || [])) {
        debts += Number((d as any).debt_amount);
      }

      // client_credits: cashback ativo (nao usado, nao expirado, ainda dentro da validade)
      const now = new Date();
      for (const c of (creditsRes.data || [])) {
        const expires = new Date((c as any).expires_at);
        if (expires > now) {
          credits += Number((c as any).credit_amount);
        }
      }

      return { credits, debts };
    },
    enabled: !!clientId && !!salonId,
  });

  const credits = query.data?.credits ?? 0;
  const debts = query.data?.debts ?? 0;
  const netBalance = Math.round((credits - debts) * 100) / 100;

  return { netBalance, isLoading: query.isLoading };
}
