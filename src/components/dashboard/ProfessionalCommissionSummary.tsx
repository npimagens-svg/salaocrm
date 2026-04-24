import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/hooks/useServices";
import { useProducts } from "@/hooks/useProducts";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useMemo } from "react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ProfessionalCommissionSummaryProps {
  professionalId: string;
  commissionPercent: number;
}

export function ProfessionalCommissionSummary({ professionalId, commissionPercent }: ProfessionalCommissionSummaryProps) {
  const { salonId } = useAuth();
  const navigate = useNavigate();
  const { services } = useServices();
  const { products } = useProducts();
  const { commissionSettings } = useCommissionSettings();

  const serviceMap = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach(s => map.set(s.id, s.commission_percent || 0));
    return map;
  }, [services]);

  const productMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.id, Number(p.commission_percent) || 0));
    return map;
  }, [products]);

  // Load per-professional per-service commission overrides
  const { data: profServiceCommissions } = useQuery({
    queryKey: ["prof-service-commissions", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .select("service_id, commission_percent")
        .eq("professional_id", professionalId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!professionalId,
  });

  const profCommMap = useMemo(() => {
    const map = new Map<string, number>();
    (profServiceCommissions ?? []).forEach(c => map.set(c.service_id, c.commission_percent));
    return map;
  }, [profServiceCommissions]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-commission-summary", salonId, professionalId, profCommMap.size],
    queryFn: async () => {
      if (!salonId || !professionalId) return null;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // Get comanda items for this professional this month
      const { data: items } = await supabase
        .from("comanda_items")
        .select("total_price, product_cost, service_id, product_id, comanda_id, item_type")
        .eq("professional_id", professionalId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      if (!items || items.length === 0) {
        return { totalServices: 0, totalCommission: 0, itemCount: 0 };
      }

      // Get comandas for card fee calculation
      const comandaIds = [...new Set(items.map(i => i.comanda_id))];
      const { data: comandas } = await supabase
        .from("comandas")
        .select("id, total, payments")
        .in("id", comandaIds);

      const comandaMap = new Map(comandas?.map(c => [c.id, c]) ?? []);

      let totalServices = 0;
      let totalCommission = 0;

      items.forEach(item => {
        const itemTotal = item.total_price || 0;
        const isProductSale = item.item_type === "product";
        const ignoreProductCost = isProductSale && !commissionSettings.product_sale_deduct_cost;
        const productCost = ignoreProductCost
          ? 0
          : (commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0);

        // Card fee proportional
        const comanda = comandaMap.get(item.comanda_id);
        let cardFee = 0;
        if (comanda) {
          const payments = comanda.payments || [];
          const totalCardFees = payments.reduce((sum: number, p: any) => sum + (p.fee_amount || 0), 0);
          const comandaTotal = comanda.total || 0;
          if (comandaTotal > 0 && totalCardFees > 0) {
            cardFee = (itemTotal / comandaTotal) * totalCardFees;
          }
        }

        // Priority: produto usa products.commission_percent (nao herda do profissional);
        // servico: professional_service_commissions > services.commission_percent > professionals.commission_percent
        let itemCommissionPercent = commissionPercent;
        if (isProductSale && item.product_id && productMap.has(item.product_id)) {
          itemCommissionPercent = productMap.get(item.product_id)!;
        } else {
          if (item.service_id && serviceMap.has(item.service_id)) {
            itemCommissionPercent = serviceMap.get(item.service_id)! || itemCommissionPercent;
          }
          if (item.service_id && profCommMap.has(item.service_id)) {
            itemCommissionPercent = profCommMap.get(item.service_id)!;
          }
        }

        let commission: number;
        if (commissionSettings.product_cost_deduction === "after_commission") {
          const netValue = itemTotal - cardFee;
          commission = (netValue * itemCommissionPercent) / 100 - productCost;
        } else {
          const netValue = itemTotal - productCost - cardFee;
          commission = (netValue * itemCommissionPercent) / 100;
        }

        totalServices += itemTotal;
        totalCommission += commission;
      });

      return { totalServices, totalCommission, itemCount: items.length };
    },
    enabled: !!salonId && !!professionalId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg font-semibold">Minha Comissão do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total em serviços:</span>
              <span className="font-medium">{formatCurrency(data?.totalServices ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Serviços realizados:</span>
              <span className="font-medium">{data?.itemCount ?? 0}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Comissão estimada:</span>
                <span className="text-xl md:text-2xl font-bold text-primary">
                  {formatCurrency(data?.totalCommission ?? 0)}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 mt-2"
              onClick={() => navigate("/comissoes")}
            >
              <DollarSign className="h-4 w-4" />
              Ver Relatório Completo
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
