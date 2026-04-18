import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DiagnosticCheck {
  key: string;
  label: string;
  description: string;
  count: number;
  severity: "ok" | "warning" | "error";
  canClean: boolean;
}

/**
 * Roda checks de consistencia do banco de dados do cliente.
 * Somente leitura aqui; operacoes de limpeza ficam no mutation separado.
 */
export function useSystemDiagnostics() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["system-diagnostics", salonId],
    queryFn: async (): Promise<DiagnosticCheck[]> => {
      if (!salonId) return [];

      const checks: DiagnosticCheck[] = [];

      // Creditos orfaos (comanda_id null) - nao deveria existir com FK em cascade
      const { count: orphanCredits } = await supabase
        .from("client_credits")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .is("comanda_id", null);

      checks.push({
        key: "orphan_credits",
        label: "Creditos orfaos",
        description: "Cashback sem comanda de origem (comandas deletadas em versoes antigas).",
        count: orphanCredits ?? 0,
        severity: (orphanCredits ?? 0) > 0 ? "warning" : "ok",
        canClean: true,
      });

      // Dividas orfaos
      const { count: orphanDebts } = await supabase
        .from("client_debts" as any)
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .is("comanda_id", null);

      checks.push({
        key: "orphan_debts",
        label: "Dividas orfas",
        description: "Dividas sem comanda de origem.",
        count: orphanDebts ?? 0,
        severity: (orphanDebts ?? 0) > 0 ? "warning" : "ok",
        canClean: true,
      });

      // Comandas fechadas sem nenhum pagamento
      const { data: closedComandas } = await supabase
        .from("comandas")
        .select("id, total")
        .eq("salon_id", salonId)
        .not("closed_at", "is", null)
        .gt("total", 0);

      let closedNoPayment = 0;
      if (closedComandas && closedComandas.length > 0) {
        const ids = closedComandas.map(c => c.id);
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("comanda_id")
          .in("comanda_id", ids);
        const withPayments = new Set((paymentsData || []).map(p => p.comanda_id));
        closedNoPayment = closedComandas.filter(c => !withPayments.has(c.id)).length;
      }

      checks.push({
        key: "closed_no_payment",
        label: "Comandas fechadas sem pagamento",
        description: "Comandas com total > 0 fechadas sem nenhum pagamento registrado.",
        count: closedNoPayment,
        severity: closedNoPayment > 0 ? "warning" : "ok",
        canClean: false,
      });

      // Agendamentos em status "paid" (legado antigo antes do fix status -> completed)
      const { count: legacyPaid } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .eq("status", "paid");

      checks.push({
        key: "legacy_paid_appointments",
        label: "Agendamentos legado em status \"paid\"",
        description: "Status antigo que nao tem cor azul na agenda (fix v4 troca para completed).",
        count: legacyPaid ?? 0,
        severity: (legacyPaid ?? 0) > 0 ? "warning" : "ok",
        canClean: true,
      });

      return checks;
    },
    enabled: !!salonId,
  });

  const cleanMutation = useMutation({
    mutationFn: async (key: string) => {
      if (!salonId) throw new Error("Salao nao encontrado");

      if (key === "orphan_credits") {
        await supabase.from("client_credits").delete().eq("salon_id", salonId).is("comanda_id", null);
      } else if (key === "orphan_debts") {
        await supabase.from("client_debts" as any).delete().eq("salon_id", salonId).is("comanda_id", null);
      } else if (key === "legacy_paid_appointments") {
        await supabase.from("appointments").update({ status: "completed" }).eq("salon_id", salonId).eq("status", "paid");
      } else {
        throw new Error(`Chave de limpeza desconhecida: ${key}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-diagnostics", salonId] });
      queryClient.invalidateQueries({ queryKey: ["client_net_balance"] });
      toast({ title: "Limpeza concluida" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao limpar", description: err.message, variant: "destructive" });
    },
  });

  return {
    checks: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    clean: cleanMutation.mutate,
    isCleaning: cleanMutation.isPending,
  };
}
