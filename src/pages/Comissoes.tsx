import { useState, useMemo, useEffect } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, DollarSign, ChevronDown, ChevronUp, FileText, Printer } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useComandas } from "@/hooks/useComandas";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useCurrentProfessional } from "@/hooks/useCurrentProfessional";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommissionItem {
  comandaId: string;
  comandaNumber: string;
  date: string;
  serviceName: string;
  clientName: string;
  serviceValue: number;
  productCost: number;
  cardFee: number;
  netValue: number;
  commissionPercent: number;
  commissionValue: number;
  serviceId: string | null;
  quantity: number;
}

export default function Comissoes() {
  const [dateStart, setDateStart] = useState(() => {
    const d = startOfMonth(new Date());
    return format(d, "yyyy-MM-dd");
  });
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [commissionStatus, setCommissionStatus] = useState<string>("all");

  const { professionalId: currentProfessionalId, isProfessionalUser, isLoading: loadingCurrentProfessional } = useCurrentProfessional();
  const { professionals, isLoading: loadingProfessionals } = useProfessionals();

  // Auto-select the current professional's ID when they are a professional user
  useEffect(() => {
    if (isProfessionalUser && currentProfessionalId) {
      setSelectedProfessional(currentProfessionalId);
    }
  }, [isProfessionalUser, currentProfessionalId]);
  const { salonId } = useAuth();
  const { comandas, isLoading: loadingComandas } = useComandas();
  const { services, isLoading: loadingServices } = useServices();
  const { clients, isLoading: loadingClients } = useClients();
  const { settings: commissionSettings } = useCommissionSettings();

  // Load per-professional per-service commission overrides
  const { data: profServiceCommissions } = useQuery({
    queryKey: ["all-professional-commissions", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .select("professional_id, service_id, commission_percent");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!salonId,
  });

  // Map: "profId:serviceId" → commission_percent
  const profServiceCommMap = useMemo(() => {
    const map = new Map<string, number>();
    (profServiceCommissions ?? []).forEach(c => {
      map.set(`${c.professional_id}:${c.service_id}`, c.commission_percent);
    });
    return map;
  }, [profServiceCommissions]);

  // Create client map for quick lookup
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach(c => map.set(c.id, c.name));
    return map;
  }, [clients]);

  // Create service map for quick lookup
  const serviceMap = useMemo(() => {
    const map = new Map<string, { name: string; commission_percent: number }>();
    services.forEach(s => map.set(s.id, { name: s.name, commission_percent: s.commission_percent || 0 }));
    return map;
  }, [services]);

  // Filter closed comandas within date range - using created_at for proper date attribution
  const filteredComandas = useMemo(() => {
    const start = new Date(dateStart + "T00:00:00");
    const end = new Date(dateEnd + "T23:59:59.999");

    return comandas.filter(comanda => {
      // Only include closed comandas
      if (!comanda.closed_at) return false;
      // Use created_at for date filtering so retroactive closures appear in correct period
      const comandaDate = new Date(comanda.created_at);
      return isWithinInterval(comandaDate, { start, end });
    });
  }, [comandas, dateStart, dateEnd]);

  // Helper to calculate the proportional card fee for an item
  const calculateItemCardFee = (comanda: typeof filteredComandas[0], itemTotal: number): number => {
    const payments = comanda.payments || [];
    const comandaTotal = comanda.total || 0;
    if (comandaTotal === 0) return 0;

    // Sum up all card fees from payments
    const totalCardFees = payments.reduce((sum, p) => sum + (p.fee_amount || 0), 0);
    if (totalCardFees === 0) return 0;

    // Proportionally distribute the fee based on item's share of total
    return (itemTotal / comandaTotal) * totalCardFees;
  };

  // Get detailed commission items for selected professional
  const commissionDetails = useMemo(() => {
    if (selectedProfessional === "all") return [];

    const items: CommissionItem[] = [];
    const selectedProf = professionals.find(p => p.id === selectedProfessional);
    if (!selectedProf) return [];

    filteredComandas.forEach((comanda, idx) => {
      const comandaItems = comanda.items || [];

      comandaItems.forEach(item => {
        const profId = item.professional_id || comanda.professional_id;
        if (profId !== selectedProfessional) return;

        // Get service info and commission percent
        // Priority: package_commission > professional_service_commissions > services.commission_percent > professionals.commission_percent
        let serviceName = item.description || "Serviço";
        let commissionPercent = selectedProf.commission_percent || 0;

        // Package items use package_commission_percent from the professional
        if (item.item_type === "package") {
          commissionPercent = selectedProf.package_commission_percent || commissionPercent;
        } else if (item.service_id && serviceMap.has(item.service_id)) {
          const serviceInfo = serviceMap.get(item.service_id)!;
          serviceName = serviceInfo.name;
          commissionPercent = serviceInfo.commission_percent || commissionPercent;
        }

        // Override with per-professional per-service commission if configured (not for packages)
        if (item.item_type !== "package" && item.service_id && profId) {
          const profCommKey = `${profId}:${item.service_id}`;
          if (profServiceCommMap.has(profCommKey)) {
            commissionPercent = profServiceCommMap.get(profCommKey)!;
          }
        }

        const serviceValue = item.total_price || 0;
        const productCost = commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0;

        // Calculate proportional card fee for this item
        const cardFee = calculateItemCardFee(comanda, serviceValue);

        // Calculate admin fee if enabled
        const adminFee = commissionSettings.admin_fee_enabled
          ? serviceValue * (commissionSettings.admin_fee_percent / 100)
          : 0;

        // Net value and commission depend on product_cost_deduction setting
        let netValue: number;
        let commissionValue: number;
        if (commissionSettings.product_cost_deduction === "after_commission") {
          netValue = serviceValue - cardFee - adminFee;
          commissionValue = (netValue * commissionPercent) / 100 - productCost;
        } else {
          netValue = serviceValue - productCost - cardFee - adminFee;
          commissionValue = (netValue * commissionPercent) / 100;
        }

        // Use created_at for the date display to show when service was performed
        const displayDate = format(new Date(comanda.created_at), "dd/MM/yyyy");

        items.push({
          comandaId: comanda.id,
          comandaNumber: `Nº${comanda.comanda_number ? String(comanda.comanda_number).padStart(4, "0") : String(idx + 1).padStart(4, "0")} (${displayDate})`,
          date: displayDate,
          serviceName: `${item.quantity || 1} x ${serviceName}`,
          clientName: comanda.client_id ? clientMap.get(comanda.client_id) || "Cliente" : "Cliente avulso",
          serviceValue,
          productCost,
          cardFee,
          netValue,
          commissionPercent,
          commissionValue,
          serviceId: item.service_id,
          quantity: item.quantity || 1,
        });
      });
    });

    return items;
  }, [selectedProfessional, filteredComandas, professionals, serviceMap, clientMap, profServiceCommMap, commissionSettings]);

  // Calculate totals for selected professional
  const professionalTotals = useMemo(() => {
    const totalServices = commissionDetails.reduce((sum, item) => sum + item.serviceValue, 0);
    const totalProductCost = commissionDetails.reduce((sum, item) => sum + item.productCost, 0);
    const totalCardFee = commissionDetails.reduce((sum, item) => sum + item.cardFee, 0);
    const totalNetValue = commissionDetails.reduce((sum, item) => sum + item.netValue, 0);
    const totalCommission = commissionDetails.reduce((sum, item) => sum + item.commissionValue, 0);
    
    return {
      baseRateio: totalServices,
      servicos: totalServices,
      productCost: totalProductCost,
      cardFee: totalCardFee,
      netValue: totalNetValue,
      produtos: 0,
      pacotes: 0,
      rateioServicos: totalCommission,
      rateioProdutos: 0,
      rateioPacotes: 0,
      totalRateio: totalCommission,
      totalCaixinhas: 0,
      totalValePresente: 0,
      descontosBonus: 0,
      totalPagar: totalCommission,
    };
  }, [commissionDetails]);

  // Calculate commissions per professional (for "all" view)
  const professionalCommissions = useMemo(() => {
    const commissionMap = new Map<string, {
      professional: typeof professionals[0];
      totalServices: number;
      productCost: number;
      cardFee: number;
      netValue: number;
      commission: number;
      discounts: number;
      totalToPay: number;
      itemCount: number;
    }>();

    professionals.forEach(prof => {
      commissionMap.set(prof.id, {
        professional: prof,
        totalServices: 0,
        productCost: 0,
        cardFee: 0,
        netValue: 0,
        commission: 0,
        discounts: 0,
        totalToPay: 0,
        itemCount: 0,
      });
    });

    filteredComandas.forEach(comanda => {
      const items = comanda.items || [];

      items.forEach(item => {
        const profId = item.professional_id || comanda.professional_id;
        if (!profId) return;

        const profData = commissionMap.get(profId);
        if (!profData) return;

        // Priority: package_commission > professional_service_commissions > services.commission_percent > professionals.commission_percent
        let commissionPercent = profData.professional.commission_percent || 0;

        if (item.item_type === "package") {
          commissionPercent = profData.professional.package_commission_percent || commissionPercent;
        } else if (item.service_id && serviceMap.has(item.service_id)) {
          commissionPercent = serviceMap.get(item.service_id)?.commission_percent || commissionPercent;
        }
        if (item.item_type !== "package" && item.service_id && profId) {
          const profCommKey = `${profId}:${item.service_id}`;
          if (profServiceCommMap.has(profCommKey)) {
            commissionPercent = profServiceCommMap.get(profCommKey)!;
          }
        }

        const itemTotal = item.total_price || 0;
        const productCost = commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0;

        // Calculate proportional card fee for this item
        const cardFee = calculateItemCardFee(comanda, itemTotal);

        // Calculate admin fee if enabled
        const adminFee = commissionSettings.admin_fee_enabled
          ? itemTotal * (commissionSettings.admin_fee_percent / 100)
          : 0;

        // Net value and commission depend on product_cost_deduction setting
        let netValue: number;
        let commission: number;
        if (commissionSettings.product_cost_deduction === "after_commission") {
          netValue = itemTotal - cardFee - adminFee;
          commission = (netValue * commissionPercent) / 100 - productCost;
        } else {
          netValue = itemTotal - productCost - cardFee - adminFee;
          commission = (netValue * commissionPercent) / 100;
        }

        profData.totalServices += itemTotal;
        profData.productCost += productCost;
        profData.cardFee += cardFee;
        profData.netValue += netValue;
        profData.commission += commission;
        profData.totalToPay += commission;
        profData.itemCount += 1;
      });
    });

    return Array.from(commissionMap.values()).filter(c => c.itemCount > 0);
  }, [professionals, filteredComandas, serviceMap, profServiceCommMap, commissionSettings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const SPECIALTY_LABELS: Record<string, string> = {
    cabeleireiro: "Cabeleireiro(a)",
    manicure: "Manicure",
    esteticista: "Esteticista",
    maquiador: "Maquiador(a)",
    barbeiro: "Barbeiro",
    depilador: "Depilador(a)",
    massagista: "Massagista",
    recepcionista: "Recepcionista",
    gerente: "Gerente",
    outro: "Outro",
  };

  const getSpecialtyLabel = (role: string | null | undefined) => {
    if (!role) return null;
    return SPECIALTY_LABELS[role] || role;
  };

  const selectedProfessionalData = professionals.find(p => p.id === selectedProfessional);

  const isLoading = loadingProfessionals || loadingComandas || loadingServices || loadingClients || (isProfessionalUser && loadingCurrentProfessional);

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Comissões</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Data Início:</Label>
                <Input 
                  type="date" 
                  value={dateStart} 
                  onChange={e => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim:</Label>
                <Input 
                  type="date" 
                  value={dateEnd} 
                  onChange={e => setDateEnd(e.target.value)}
                />
              </div>
              {!isProfessionalUser && (
                <div className="space-y-2">
                  <Label>Profissionais:</Label>
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {professionals.filter(p => p.is_active).map(prof => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name} {(prof as any).role ? `- ${getSpecialtyLabel((prof as any).role)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Comissões:</Label>
                <Select value={commissionStatus} onValueChange={setCommissionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unpaid">Não pagas</SelectItem>
                    <SelectItem value="paid">Pagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end">
                <Button className="gap-2 w-full">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show detailed view when professional is selected */}
        {selectedProfessional !== "all" && selectedProfessionalData ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Detailed Table */}
            <div className="lg:col-span-3 space-y-4">
              {/* Professional Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedProfessionalData.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedProfessionalData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedProfessionalData.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {getSpecialtyLabel((selectedProfessionalData as any).role) || "Profissional"} • {commissionDetails.length} serviço{commissionDetails.length !== 1 ? "s" : ""} no período
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Report Actions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Relatório de comissão
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Detailed Services Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comanda</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Serviços e Produtos</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Custo Prod.</TableHead>
                        <TableHead className="text-right">Taxa Cartão</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionDetails.map((item, idx) => (
                        <TableRow key={`${item.comandaId}-${idx}`}>
                          <TableCell className="font-mono text-sm">{item.comandaNumber}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.serviceName}</TableCell>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.serviceValue)}</TableCell>
                          <TableCell className="text-right text-destructive">
                            {item.productCost > 0 ? `-${formatCurrency(item.productCost)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {item.cardFee > 0 ? `-${formatCurrency(item.cardFee)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.netValue)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant="secondary">{item.commissionPercent}%</Badge>
                              <span className="font-medium text-primary">{formatCurrency(item.commissionValue)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {commissionDetails.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Nenhum serviço encontrado no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Base de Rateio Geral */}
                  <div className="pb-3 border-b">
                    <div className="flex justify-between font-medium mb-2">
                      <span>Base de Rateio (Valor dos Serviços):</span>
                      <span>{formatCurrency(professionalTotals.baseRateio)}</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Serviços:</span>
                        <span>{formatCurrency(professionalTotals.servicos)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Cost Deduction */}
                  {professionalTotals.productCost > 0 && (
                    <div className="pb-3 border-b">
                      <div className="flex justify-between font-medium mb-2 text-destructive">
                        <span>(-) Custo de Produtos:</span>
                        <span>-{formatCurrency(professionalTotals.productCost)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Produtos consumidos nos serviços realizados
                      </p>
                    </div>
                  )}

                  {/* Card Fee Deduction */}
                  {professionalTotals.cardFee > 0 && (
                    <div className="pb-3 border-b">
                      <div className="flex justify-between font-medium mb-2 text-destructive">
                        <span>(-) Taxa de Cartão:</span>
                        <span>-{formatCurrency(professionalTotals.cardFee)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Taxa proporcional das bandeiras de cartão
                      </p>
                    </div>
                  )}

                  {/* Net Value */}
                  <div className="pb-3 border-b">
                    <div className="flex justify-between font-medium mb-2">
                      <span>Valor Líquido (Base para Comissão):</span>
                      <span>{formatCurrency(professionalTotals.netValue)}</span>
                    </div>
                  </div>

                  {/* Rateio */}
                  <div className="pb-3 border-b">
                    <div className="flex justify-between font-medium mb-2">
                      <span>Rateio (Comissão):</span>
                      <span>{formatCurrency(professionalTotals.totalRateio)}</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Comissão sobre Serviços:</span>
                        <span>{formatCurrency(professionalTotals.rateioServicos)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Extras */}
                  <div className="pb-3 border-b space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Caixinhas:</span>
                      <span>{formatCurrency(professionalTotals.totalCaixinhas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Vale-Presente:</span>
                      <span>{formatCurrency(professionalTotals.totalValePresente)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descontos e Bônus:</span>
                      <span className={professionalTotals.descontosBonus < 0 ? "text-destructive" : ""}>
                        {formatCurrency(professionalTotals.descontosBonus)}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total a pagar:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(professionalTotals.totalPagar)}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full gap-2 mt-4" disabled={professionalTotals.totalPagar <= 0}>
                    <DollarSign className="h-4 w-4" />
                    Pagar Comissão
                  </Button>
                  
                  <button className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1">
                    Solicitar Recalculo
                    <span className="text-muted-foreground">ℹ</span>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Show all professionals summary when none selected */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selecione um profissional para ver o relatório detalhado</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                        <TableHead className="text-right">Total Serviços</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {professionalCommissions.map((item) => (
                        <TableRow 
                          key={item.professional.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedProfessional(item.professional.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.professional.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(item.professional.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{item.professional.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.professional.role || "-"}</TableCell>
                          <TableCell className="text-right">{item.itemCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalServices)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(item.totalToPay)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {professionalCommissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum profissional com comissões no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resumo Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Serviços:</span>
                    <span className="font-medium">
                      {formatCurrency(professionalCommissions.reduce((sum, c) => sum + c.totalServices, 0))}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Comissões:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(professionalCommissions.reduce((sum, c) => sum + c.totalToPay, 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayoutNew>
  );
}
