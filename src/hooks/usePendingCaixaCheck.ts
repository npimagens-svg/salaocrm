import { useMemo } from "react";
import { useCaixas } from "./useCaixas";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay } from "date-fns";

/**
 * Hook that checks if the current user has an open caixa from a previous day.
 * Used to block creating comandas, appointments, or opening a new caixa
 * until yesterday's caixa is closed.
 */
export function usePendingCaixaCheck() {
  const { openCaixas, isLoading } = useCaixas();
  const { user } = useAuth();
  const userId = user?.id;

  const pendingCaixa = useMemo(() => {
    if (!userId || isLoading) return null;

    const today = startOfDay(new Date());

    // Find open caixas from previous days for the current user
    const pending = openCaixas.find(c => {
      if (c.user_id !== userId) return false;
      const caixaDate = startOfDay(new Date(c.opened_at));
      return caixaDate.getTime() < today.getTime();
    });

    return pending || null;
  }, [openCaixas, userId, isLoading]);

  const pendingCaixaDate = pendingCaixa
    ? new Date(pendingCaixa.opened_at).toLocaleDateString("pt-BR")
    : null;

  return {
    hasPendingCaixa: !!pendingCaixa,
    pendingCaixa,
    pendingCaixaDate,
    isLoading,
    message: pendingCaixa
      ? `Você tem um caixa aberto de ${pendingCaixaDate} que precisa ser finalizado antes de continuar.`
      : null,
  };
}
