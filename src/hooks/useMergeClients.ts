import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ClientInput } from "@/hooks/useClients";

export interface MergeCounts {
  appointments: number;
  comandas: number;
  client_history: number;
  client_credits: number;
  client_debts: number;
  client_balance: number;
  client_packages: number;
  client_alerts: number;
  email_logs: number;
  stock_movements: number;
  comanda_deletions: number;
  email_campaigns: number;
  sms_campaigns: number;
}

export interface MergeClientsInput {
  winnerId: string;
  loserId: string;
  winnerData: ClientInput;
}

async function countRows(table: string, column: string, id: string, salonId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("salon_id", salonId)
    .eq(column, id);
  if (error) throw new Error(`Erro ao contar ${table}: ${error.message}`);
  return count ?? 0;
}

async function countArrayContains(table: string, column: string, id: string, salonId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("salon_id", salonId)
    .contains(column, [id]);
  if (error) throw new Error(`Erro ao contar ${table}: ${error.message}`);
  return count ?? 0;
}

export function useMergeCounts(loserId: string | null) {
  const { salonId } = useAuth();
  return useQuery({
    queryKey: ["mergeCounts", salonId, loserId],
    enabled: !!salonId && !!loserId,
    queryFn: async (): Promise<MergeCounts> => {
      if (!salonId || !loserId) throw new Error("salon ou cliente ausente");
      const [
        appointments,
        comandas,
        client_history,
        client_credits,
        client_debts,
        client_balance,
        client_packages,
        client_alerts,
        email_logs,
        stock_movements,
        comanda_deletions,
        email_campaigns,
        sms_campaigns,
      ] = await Promise.all([
        countRows("appointments", "client_id", loserId, salonId),
        countRows("comandas", "client_id", loserId, salonId),
        countRows("client_history", "client_id", loserId, salonId),
        countRows("client_credits", "client_id", loserId, salonId),
        countRows("client_debts", "client_id", loserId, salonId),
        countRows("client_balance", "client_id", loserId, salonId),
        countRows("client_packages", "client_id", loserId, salonId),
        countRows("client_alerts", "target_client_id", loserId, salonId),
        countRows("email_logs", "client_id", loserId, salonId),
        countRows("stock_movements", "client_id", loserId, salonId),
        countRows("comanda_deletions", "client_id", loserId, salonId),
        countArrayContains("email_campaigns", "target_client_ids", loserId, salonId),
        countArrayContains("sms_campaigns", "target_client_ids", loserId, salonId),
      ]);
      return {
        appointments,
        comandas,
        client_history,
        client_credits,
        client_debts,
        client_balance,
        client_packages,
        client_alerts,
        email_logs,
        stock_movements,
        comanda_deletions,
        email_campaigns,
        sms_campaigns,
      };
    },
  });
}

const SCALAR_TABLES: Array<{ table: string; column: string }> = [
  { table: "appointments", column: "client_id" },
  { table: "comandas", column: "client_id" },
  { table: "client_history", column: "client_id" },
  { table: "client_credits", column: "client_id" },
  { table: "client_debts", column: "client_id" },
  { table: "client_balance", column: "client_id" },
  { table: "client_packages", column: "client_id" },
  { table: "client_alerts", column: "target_client_id" },
  { table: "email_logs", column: "client_id" },
  { table: "stock_movements", column: "client_id" },
  { table: "comanda_deletions", column: "client_id" },
];

const ARRAY_TABLES: Array<{ table: string; column: string }> = [
  { table: "email_campaigns", column: "target_client_ids" },
  { table: "sms_campaigns", column: "target_client_ids" },
];

async function reassignArrayColumn(
  table: string,
  column: string,
  loserId: string,
  winnerId: string,
  salonId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .eq("salon_id", salonId)
    .contains(column, [loserId]);
  if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
  if (!data) return;
  for (const row of data as Array<Record<string, unknown>>) {
    const ids = (row[column] as string[]) ?? [];
    const next = Array.from(new Set(ids.map((x) => (x === loserId ? winnerId : x))));
    const { error: updErr } = await supabase
      .from(table)
      .update({ [column]: next })
      .eq("id", row.id as string);
    if (updErr) throw new Error(`Erro ao atualizar ${table}: ${updErr.message}`);
  }
}

export function useMergeClients() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ winnerId, loserId, winnerData }: MergeClientsInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      if (winnerId === loserId) throw new Error("Cliente principal e duplicado precisam ser diferentes");

      // 1) Atualiza o cliente vencedor com os campos escolhidos
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(winnerData)) {
        cleaned[key] = value === "" || value === undefined ? null : value;
      }
      const { error: updErr } = await supabase
        .from("clients")
        .update(cleaned)
        .eq("id", winnerId)
        .eq("salon_id", salonId);
      if (updErr) throw new Error(`Erro ao atualizar cliente principal: ${updErr.message}`);

      // 2) Reassign FKs escalares do perdedor para o vencedor
      for (const { table, column } of SCALAR_TABLES) {
        const { error } = await supabase
          .from(table)
          .update({ [column]: winnerId })
          .eq("salon_id", salonId)
          .eq(column, loserId);
        if (error) throw new Error(`Erro ao migrar ${table}: ${error.message}`);
      }

      // 3) Substitui o id do perdedor nos arrays de campanhas
      for (const { table, column } of ARRAY_TABLES) {
        await reassignArrayColumn(table, column, loserId, winnerId, salonId);
      }

      // 4) Deleta o cliente perdedor (já não tem nenhuma FK apontando pra ele)
      const { error: delErr } = await supabase
        .from("clients")
        .delete()
        .eq("id", loserId)
        .eq("salon_id", salonId);
      if (delErr) throw new Error(`Erro ao remover cliente duplicado: ${delErr.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", salonId] });
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["client_credits"] });
      queryClient.invalidateQueries({ queryKey: ["client_debts"] });
      queryClient.invalidateQueries({ queryKey: ["client_balance"] });
      queryClient.invalidateQueries({ queryKey: ["client_packages"] });
      toast({ title: "Cadastros unidos com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao unir cadastros",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
