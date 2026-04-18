import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CommissionSettings {
  id: string;
  salon_id: string;
  // Data de Recebimento
  card_payment_date: string;
  // Descontos
  pix_fee_percent: number;
  anticipation_fee_enabled: boolean;
  anticipation_fee_percent: number;
  card_fee_mode: string;
  custom_card_fee_percent: number;
  admin_fee_enabled: boolean;
  admin_fee_percent: number;
  admin_fee_scope: string;
  service_cost_enabled: boolean;
  product_cost_deduction: string;
  // Recibo
  show_revenue_values: boolean;
  show_costs_values: boolean;
  admin_fee_display: string;
  card_fee_display: string;
  service_fee_display: string;
  // Avançada
  presale_commission_rule: string;
  presale_commission_percent: number;
  gift_card_commission_percent: number;
  package_commission_enabled: boolean;
  package_commission_percent: number;
  dual_assistant_rule: string;
  receipt_footer_message: string;
  // Programa de Fidelidade (Cashback)
  loyalty_percent: number;
  loyalty_validity_days: number;
  loyalty_min_purchase: number;
}

const DEFAULTS: Omit<CommissionSettings, "id" | "salon_id"> = {
  card_payment_date: "comanda_date",
  pix_fee_percent: 0,
  anticipation_fee_enabled: false,
  anticipation_fee_percent: 0,
  card_fee_mode: "card_brands",
  custom_card_fee_percent: 0,
  admin_fee_enabled: false,
  admin_fee_percent: 0,
  admin_fee_scope: "services_only",
  service_cost_enabled: true,
  product_cost_deduction: "before_commission",
  show_revenue_values: true,
  show_costs_values: true,
  admin_fee_display: "summary",
  card_fee_display: "summary",
  service_fee_display: "summary",
  presale_commission_rule: "discounted_value",
  presale_commission_percent: 0,
  gift_card_commission_percent: 0,
  package_commission_enabled: false,
  package_commission_percent: 0,
  dual_assistant_rule: "full_value",
  receipt_footer_message: "",
  loyalty_percent: 7,
  loyalty_validity_days: 15,
  loyalty_min_purchase: 100,
};

export function useCommissionSettings() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["commission-settings", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data, error } = await supabase
        .from("commission_settings")
        .select("*")
        .eq("salon_id", salonId)
        .maybeSingle();
      if (error) throw error;
      return data as CommissionSettings | null;
    },
    enabled: !!salonId,
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: Partial<Omit<CommissionSettings, "id" | "salon_id">>) => {
      if (!salonId) throw new Error("Salon ID not found");

      const existing = query.data;
      if (existing) {
        const { data, error } = await supabase
          .from("commission_settings")
          .update(settings)
          .eq("salon_id", salonId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("commission_settings")
          .insert({ salon_id: salonId, ...settings })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-settings", salonId] });
      toast({ title: "Configurações de comissão salvas!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar configurações", description: error.message, variant: "destructive" });
    },
  });

  // Merge DB data with defaults
  const settings: Omit<CommissionSettings, "id" | "salon_id"> = {
    ...DEFAULTS,
    ...(query.data ? Object.fromEntries(
      Object.entries(query.data).filter(([k]) => k !== "id" && k !== "salon_id" && k !== "created_at" && k !== "updated_at")
    ) : {}),
  };

  return {
    settings,
    isLoading: query.isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
