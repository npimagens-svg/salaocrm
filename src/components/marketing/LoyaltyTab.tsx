import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Clock, CheckCircle, XCircle, Settings, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";

export function LoyaltyTab() {
  const { salonId } = useAuth();
  const { settings, save, isSaving } = useCommissionSettings();

  const [form, setForm] = useState({
    loyalty_percent: settings.loyalty_percent,
    loyalty_validity_days: settings.loyalty_validity_days,
    loyalty_min_purchase: settings.loyalty_min_purchase,
  });

  useEffect(() => {
    setForm({
      loyalty_percent: settings.loyalty_percent,
      loyalty_validity_days: settings.loyalty_validity_days,
      loyalty_min_purchase: settings.loyalty_min_purchase,
    });
  }, [settings.loyalty_percent, settings.loyalty_validity_days, settings.loyalty_min_purchase]);

  const isDirty =
    form.loyalty_percent !== settings.loyalty_percent ||
    form.loyalty_validity_days !== settings.loyalty_validity_days ||
    form.loyalty_min_purchase !== settings.loyalty_min_purchase;

  const handleSave = () => {
    save({
      loyalty_percent: form.loyalty_percent,
      loyalty_validity_days: form.loyalty_validity_days,
      loyalty_min_purchase: form.loyalty_min_purchase,
    });
  };

  const { data: credits, isLoading } = useQuery({
    queryKey: ["client-credits", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("client_credits")
        .select("*, clients(name, email, phone)")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const stats = {
    total: credits?.length || 0,
    active: credits?.filter(c => !c.is_used && !c.is_expired && new Date(c.expires_at) > new Date()).length || 0,
    used: credits?.filter(c => c.is_used).length || 0,
    totalValue: credits?.filter(c => !c.is_used && !c.is_expired && new Date(c.expires_at) > new Date()).reduce((sum, c) => sum + Number(c.credit_amount), 0) || 0,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Créditos de cashback gerados automaticamente ao fechar comandas ({settings.loyalty_percent}% do valor, válido por {settings.loyalty_validity_days} dias, compras acima de R$ {Number(settings.loyalty_min_purchase).toFixed(2).replace(".", ",")}).
      </p>

      {/* Configurações do Programa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Configurações do Programa de Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="loyalty_percent">% de Cashback</Label>
              <div className="relative">
                <Input
                  id="loyalty_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.loyalty_percent}
                  onChange={(e) => setForm({ ...form, loyalty_percent: parseFloat(e.target.value) || 0 })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Percentual aplicado sobre serviços com preço cheio.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loyalty_validity_days">Validade do crédito</Label>
              <div className="relative">
                <Input
                  id="loyalty_validity_days"
                  type="number"
                  min={1}
                  step={1}
                  value={form.loyalty_validity_days}
                  onChange={(e) => setForm({ ...form, loyalty_validity_days: parseInt(e.target.value) || 0 })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">dias</span>
              </div>
              <p className="text-xs text-muted-foreground">Quantos dias o crédito fica ativo após geração.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loyalty_min_purchase">Compra mínima</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="loyalty_min_purchase"
                  type="number"
                  min={0}
                  step={0.01}
                  className="pl-9"
                  value={form.loyalty_min_purchase}
                  onChange={(e) => setForm({ ...form, loyalty_min_purchase: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Valor mínimo da próxima comanda pra usar o crédito.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isDirty && <span className="text-xs text-amber-600 font-medium">Alterações não salvas</span>}
            <Button onClick={handleSave} disabled={!isDirty || isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Créditos Gerados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{stats.used}</p>
            <p className="text-sm text-muted-foreground">Utilizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">R$ {stats.totalValue.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Valor Ativo Total</p>
          </CardContent>
        </Card>
      </div>

      {!credits || credits.length === 0 ? (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum crédito gerado ainda</p>
            <p className="text-sm">Créditos são gerados automaticamente ao fechar comandas</p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {credits.map((credit: any) => {
                const isExpired = credit.is_expired || (!credit.is_used && new Date(credit.expires_at) <= new Date());
                const status = credit.is_used ? "used" : isExpired ? "expired" : "active";
                const statusConfig = {
                  active: { label: "Ativo", variant: "default" as const, icon: Clock },
                  used: { label: "Utilizado", variant: "secondary" as const, icon: CheckCircle },
                  expired: { label: "Expirado", variant: "destructive" as const, icon: XCircle },
                };
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <div key={credit.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`h-5 w-5 ${status === "active" ? "text-orange-500" : status === "used" ? "text-green-600" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium">{(credit.clients as any)?.name || "Cliente"}</p>
                        <p className="text-sm text-muted-foreground">
                          Criado em {format(new Date(credit.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          {" • "}Expira em {format(new Date(credit.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">R$ {Number(credit.credit_amount).toFixed(2)}</span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
