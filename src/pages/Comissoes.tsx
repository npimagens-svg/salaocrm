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
import { Search, Loader2, DollarSign, ChevronDown, ChevronUp, FileText, Printer, Gift, MinusCircle, Trash2 } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useComandas } from "@/hooks/useComandas";
import { useServices } from "@/hooks/useServices";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useCurrentProfessional } from "@/hooks/useCurrentProfessional";
import { useCommissionAdjustments, AdjustmentType } from "@/hooks/useCommissionAdjustments";
import { CommissionAdjustmentModal } from "@/components/modals/CommissionAdjustmentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  paymentMethod: string;
}

export default function Comissoes() {
  const [dateStart, setDateStart] = useState(() => {
    const d = startOfMonth(new Date());
    return format(d, "yyyy-MM-dd");
  });
  const [dateEnd, setDateEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [commissionStatus, setCommissionStatus] = useState<string>("all");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const { professionalId: currentProfessionalId, isProfessionalUser, isLoading: loadingCurrentProfessional } = useCurrentProfessional();
  const { professionals, isLoading: loadingProfessionals } = useProfessionals();
  const { user, userRole, isMaster } = useAuth();
  const canManageAdjustments = !isProfessionalUser && (isMaster || userRole === "admin" || userRole === "manager");
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentModalType, setAdjustmentModalType] = useState<AdjustmentType>("bonus");
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<{ id: string; label: string } | null>(null);

  // Auto-select the current professional's ID when they are a professional user
  useEffect(() => {
    if (isProfessionalUser && currentProfessionalId) {
      setSelectedProfessional(currentProfessionalId);
    }
  }, [isProfessionalUser, currentProfessionalId]);
  const { salonId } = useAuth();
  const { comandas, isLoading: loadingComandas } = useComandas();
  const { services, isLoading: loadingServices } = useServices();
  const { products, isLoading: loadingProducts } = useProducts();
  const { clients, isLoading: loadingClients } = useClients();
  const { settings: commissionSettings } = useCommissionSettings();
  const {
    adjustments: periodAdjustments,
    createAdjustment,
    deleteAdjustment,
    isCreating: isCreatingAdjustment,
    isDeleting: isDeletingAdjustment,
  } = useCommissionAdjustments({
    periodStart: dateStart,
    periodEnd: dateEnd,
    professionalId: selectedProfessional !== "all" ? selectedProfessional : undefined,
  });

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

  // Create product map for quick lookup (produtos vendidos na comanda)
  const productMap = useMemo(() => {
    const map = new Map<string, { name: string; commission_percent: number }>();
    products.forEach(p => map.set(p.id, { name: p.name, commission_percent: Number(p.commission_percent) || 0 }));
    return map;
  }, [products]);

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
        // Produtos vendidos: usa products.commission_percent (nao herda do profissional)
        let serviceName = item.description || "Serviço";
        let commissionPercent = selectedProf.commission_percent || 0;

        // Package items use package_commission_percent from the professional
        if (item.item_type === "package") {
          commissionPercent = selectedProf.package_commission_percent || commissionPercent;
        } else if (item.item_type === "product" && item.product_id && productMap.has(item.product_id)) {
          const productInfo = productMap.get(item.product_id)!;
          serviceName = productInfo.name;
          // Produto usa SOMENTE o percentual cadastrado nele (pode ser 0)
          commissionPercent = productInfo.commission_percent;
        } else if (item.service_id && serviceMap.has(item.service_id)) {
          const serviceInfo = serviceMap.get(item.service_id)!;
          serviceName = serviceInfo.name;
          commissionPercent = serviceInfo.commission_percent || commissionPercent;
        }

        // Override with per-professional per-service commission if configured (not for packages/products)
        if (item.item_type === "service" && item.service_id && profId) {
          const profCommKey = `${profId}:${item.service_id}`;
          if (profServiceCommMap.has(profCommKey)) {
            commissionPercent = profServiceCommMap.get(profCommKey)!;
          }
        }

        const serviceValue = item.total_price || 0;
        const isProductSale = item.item_type === "product";
        const ignoreProductCost = isProductSale && !commissionSettings.product_sale_deduct_cost;
        const productCost = ignoreProductCost
          ? 0
          : (commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0);

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
          // Deduct product cost AFTER commission: commission on (service - fees), then subtract product cost
          netValue = serviceValue - cardFee - adminFee;
          commissionValue = (netValue * commissionPercent) / 100 - productCost;
        } else {
          // Default: deduct product cost BEFORE commission
          netValue = serviceValue - productCost - cardFee - adminFee;
          commissionValue = (netValue * commissionPercent) / 100;
        }

        // Use created_at for the date display to show when service was performed
        const displayDate = format(new Date(comanda.created_at), "dd/MM/yyyy");

        // Get primary payment method for this comanda
        const payments = comanda.payments || [];
        const primaryPayment = payments.length > 0 ? payments.reduce((a, b) => (a.amount > b.amount ? a : b)) : null;
        const PAYMENT_LABELS: Record<string, string> = {
          cash: "Dinheiro", credit_card: "Cartão Crédito", debit_card: "Cartão Débito",
          pix: "PIX", transfer: "Transferência", voucher: "Voucher", other: "Outro",
        };
        const paymentMethod = primaryPayment ? (PAYMENT_LABELS[primaryPayment.payment_method] || primaryPayment.payment_method) : "-";

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
          paymentMethod,
        });
      });
    });

    return items;
  }, [selectedProfessional, filteredComandas, professionals, serviceMap, productMap, clientMap, profServiceCommMap, commissionSettings]);

  // Calculate totals for selected professional
  const professionalTotals = useMemo(() => {
    const totalServices = commissionDetails.reduce((sum, item) => sum + item.serviceValue, 0);
    const totalProductCost = commissionDetails.reduce((sum, item) => sum + item.productCost, 0);
    const totalCardFee = commissionDetails.reduce((sum, item) => sum + item.cardFee, 0);
    const totalNetValue = commissionDetails.reduce((sum, item) => sum + item.netValue, 0);
    const totalCommission = commissionDetails.reduce((sum, item) => sum + item.commissionValue, 0);

    const totalBonus = periodAdjustments
      .filter(a => a.adjustment_type === "bonus")
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDiscount = periodAdjustments
      .filter(a => a.adjustment_type === "discount")
      .reduce((sum, a) => sum + Number(a.amount), 0);

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
      totalBonus,
      totalDiscount,
      descontosBonus: totalBonus - totalDiscount,
      totalPagar: totalCommission + totalBonus - totalDiscount,
    };
  }, [commissionDetails, periodAdjustments]);

  const openAdjustmentModal = (type: AdjustmentType) => {
    setAdjustmentModalType(type);
    setAdjustmentModalOpen(true);
  };

  const handleConfirmDeleteAdjustment = () => {
    if (!adjustmentToDelete) return;
    deleteAdjustment(adjustmentToDelete.id);
    setAdjustmentToDelete(null);
  };

  // Group commission details by date for mobile view
  const dailyCommissions = useMemo(() => {
    const grouped = new Map<string, { items: CommissionItem[]; totalProduction: number; totalCommission: number }>();
    commissionDetails.forEach(item => {
      const existing = grouped.get(item.date);
      if (existing) {
        existing.items.push(item);
        existing.totalProduction += item.serviceValue;
        existing.totalCommission += item.commissionValue;
      } else {
        grouped.set(item.date, {
          items: [item],
          totalProduction: item.serviceValue,
          totalCommission: item.commissionValue,
        });
      }
    });
    return Array.from(grouped.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [da, ma] = a.date.split("/").map(Number);
        const [db, mb] = b.date.split("/").map(Number);
        return mb - ma || db - da;
      });
  }, [commissionDetails]);

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

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
        // Produtos vendidos: usa products.commission_percent (nao herda do profissional)
        let commissionPercent = profData.professional.commission_percent || 0;

        if (item.item_type === "package") {
          commissionPercent = profData.professional.package_commission_percent || commissionPercent;
        } else if (item.item_type === "product" && item.product_id && productMap.has(item.product_id)) {
          commissionPercent = productMap.get(item.product_id)!.commission_percent;
        } else if (item.service_id && serviceMap.has(item.service_id)) {
          commissionPercent = serviceMap.get(item.service_id)?.commission_percent || commissionPercent;
        }
        if (item.item_type === "service" && item.service_id && profId) {
          const profCommKey = `${profId}:${item.service_id}`;
          if (profServiceCommMap.has(profCommKey)) {
            commissionPercent = profServiceCommMap.get(profCommKey)!;
          }
        }

        const itemTotal = item.total_price || 0;
        const isProductSale = item.item_type === "product";
        const ignoreProductCost = isProductSale && !commissionSettings.product_sale_deduct_cost;
        const productCost = ignoreProductCost
          ? 0
          : (commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0);

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
  }, [professionals, filteredComandas, serviceMap, productMap, profServiceCommMap, commissionSettings]);

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

  const isLoading = loadingProfessionals || loadingComandas || loadingServices || loadingProducts || loadingClients || (isProfessionalUser && loadingCurrentProfessional);

  const generateCommissionPDF = () => {
    if (!selectedProfessionalData) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const profName = selectedProfessionalData.name;
    const periodo = `${dateStart.split("-").reverse().join("/")} a ${dateEnd.split("-").reverse().join("/")}`;

    // Header
    doc.setFontSize(16);
    doc.text("Relatório de Comissão", 14, 15);
    doc.setFontSize(11);
    doc.text(`Profissional: ${profName}`, 14, 23);
    doc.text(`Período: ${periodo}`, 14, 29);

    // Table
    autoTable(doc, {
      startY: 35,
      head: [["Comanda", "Data", "Serviço", "Cliente", "Valor", "Custo Prod.", "Taxa Cartão", "Líquido", "%", "Comissão"]],
      body: commissionDetails.map(item => [
        item.comandaNumber,
        item.date,
        item.serviceName,
        item.clientName,
        formatCurrency(item.serviceValue),
        item.productCost > 0 ? `-${formatCurrency(item.productCost)}` : "-",
        item.cardFee > 0 ? `-${formatCurrency(item.cardFee)}` : "-",
        formatCurrency(item.netValue),
        `${item.commissionPercent}%`,
        formatCurrency(item.commissionValue),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12] },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        9: { halign: "right" },
      },
    });

    // Ajustes do período (bônus e descontos)
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    let cursorY = finalY + 10;
    if (periodAdjustments.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [["Ajustes do período", "Data", "Tipo", "Motivo", "Valor"]],
        body: periodAdjustments.map(a => [
          "",
          format(new Date(a.adjustment_date + "T00:00:00"), "dd/MM/yyyy"),
          a.adjustment_type === "bonus" ? "Bônus" : "Desconto",
          a.description || "-",
          `${a.adjustment_type === "bonus" ? "+" : "-"}${formatCurrency(Number(a.amount))}`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [234, 88, 12] },
        columnStyles: { 4: { halign: "right" } },
      });
      cursorY = (doc as any).lastAutoTable?.finalY || cursorY + 20;
    }

    // Summary
    const summaryY = cursorY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo", 14, summaryY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines: [string, string][] = [
      [`Base de Rateio (Serviços):`, formatCurrency(professionalTotals.baseRateio)],
      ...(professionalTotals.productCost > 0 ? [[`(-) Custo de Produtos:`, `-${formatCurrency(professionalTotals.productCost)}`]] as [string, string][] : []),
      ...(professionalTotals.cardFee > 0 ? [[`(-) Taxa de Cartão:`, `-${formatCurrency(professionalTotals.cardFee)}`]] as [string, string][] : []),
      [`Valor Líquido:`, formatCurrency(professionalTotals.netValue)],
      [`Comissão:`, formatCurrency(professionalTotals.totalRateio)],
      ...(professionalTotals.totalBonus > 0 ? [[`(+) Bônus:`, `+${formatCurrency(professionalTotals.totalBonus)}`]] as [string, string][] : []),
      ...(professionalTotals.totalDiscount > 0 ? [[`(-) Descontos:`, `-${formatCurrency(professionalTotals.totalDiscount)}`]] as [string, string][] : []),
    ];
    lines.forEach(([label, value], i) => {
      doc.text(label, 14, summaryY + 7 + i * 5);
      doc.text(value, 100, summaryY + 7 + i * 5, { align: "right" });
    });

    // Total
    const totalY = summaryY + 7 + lines.length * 5 + 3;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total a pagar:", 14, totalY);
    doc.text(formatCurrency(professionalTotals.totalPagar), 100, totalY, { align: "right" });

    return doc;
  };

  const handlePrint = () => {
    const doc = generateCommissionPDF();
    if (!doc) return;
    // Open in new window for printing
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.print();
      });
    }
  };

  const handlePDF = () => {
    const doc = generateCommissionPDF();
    if (!doc) return;
    const profName = selectedProfessionalData?.name?.replace(/\s+/g, "_") || "profissional";
    const periodo = `${dateStart}_${dateEnd}`;
    doc.save(`Comissao_${profName}_${periodo}.pdf`);
  };

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Relatório de comissão
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManageAdjustments && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustmentModal("bonus")}
                        className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        + Bônus
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdjustmentModal("discount")}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      >
                        <MinusCircle className="h-4 w-4 mr-2" />
                        + Desconto
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Desktop: Detailed Services Table */}
              <div className="hidden md:block">
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

              {/* Mobile: Daily cards with expandable details */}
              <div className="md:hidden space-y-3">
                {dailyCommissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Nenhum serviço encontrado no período
                    </CardContent>
                  </Card>
                ) : (
                  dailyCommissions.map(day => (
                    <Card key={day.date}>
                      <CardContent className="p-0">
                        <button
                          type="button"
                          className="w-full flex items-center gap-4 p-4"
                          onClick={() => toggleDay(day.date)}
                        >
                          <span className="text-primary font-semibold text-lg">{day.date.slice(0, 5)}</span>
                          <div className="border-l-2 border-primary/40 pl-4">
                            <p className="text-xs text-muted-foreground font-medium uppercase">produção</p>
                            <p className="font-semibold">{formatCurrency(day.totalProduction)}</p>
                          </div>
                          <div className="border-l-2 border-primary/40 pl-4">
                            <p className="text-xs text-muted-foreground font-medium uppercase">rateio</p>
                            <p className="font-semibold">{formatCurrency(day.totalCommission)}</p>
                          </div>
                          <div className="ml-auto">
                            {expandedDays.has(day.date) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {expandedDays.has(day.date) && (
                          <div className="px-4 pb-4 space-y-3">
                            {day.items.map((item, idx) => (
                              <div key={`${item.comandaId}-${idx}`} className="border rounded-lg p-3 bg-muted/30 text-sm space-y-1">
                                <p className="font-semibold text-primary">{item.comandaNumber.split(" (")[0]} {item.date}</p>
                                <p><span className="font-medium">Item:</span> {item.serviceName}</p>
                                <p><span className="font-medium">Cliente:</span> {item.clientName}</p>
                                <p><span className="font-medium">Valor:</span> {formatCurrency(item.serviceValue)}</p>
                                <p><span className="font-medium">Tipo de Pagamento:</span> {item.paymentMethod}</p>
                                {item.productCost > 0 && (
                                  <p className="text-destructive"><span className="font-medium">Custo de Produto:</span> -{formatCurrency(item.productCost)}</p>
                                )}
                                <p className="text-primary font-medium">
                                  Comissão: {formatCurrency(item.commissionValue)} ({item.commissionPercent}%)
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Ajustes do período (bônus e descontos) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ajustes do período</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {periodAdjustments.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum bônus ou desconto registrado neste período.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {periodAdjustments.map(adj => {
                        const isBonus = adj.adjustment_type === "bonus";
                        return (
                          <div
                            key={adj.id}
                            className="flex items-center gap-3 p-3 sm:p-4"
                          >
                            <div className={`rounded-full p-2 ${isBonus ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                              {isBonus ? <Gift className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {adj.description || (isBonus ? "Bônus" : "Desconto")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(adj.adjustment_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                {adj.created_by_name ? ` • ${adj.created_by_name}` : ""}
                              </p>
                            </div>
                            <div className={`text-sm font-semibold ${isBonus ? "text-green-700" : "text-destructive"}`}>
                              {isBonus ? "+" : "-"}{formatCurrency(Number(adj.amount))}
                            </div>
                            {canManageAdjustments && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setAdjustmentToDelete({
                                    id: adj.id,
                                    label: `${isBonus ? "bônus" : "desconto"} de ${formatCurrency(Number(adj.amount))}`,
                                  })
                                }
                                aria-label="Remover ajuste"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      <span className="text-muted-foreground">Bônus:</span>
                      <span className={professionalTotals.totalBonus > 0 ? "text-green-700 font-medium" : ""}>
                        {professionalTotals.totalBonus > 0 ? "+" : ""}{formatCurrency(professionalTotals.totalBonus)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descontos:</span>
                      <span className={professionalTotals.totalDiscount > 0 ? "text-destructive font-medium" : ""}>
                        {professionalTotals.totalDiscount > 0 ? "-" : ""}{formatCurrency(professionalTotals.totalDiscount)}
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

      {canManageAdjustments && selectedProfessional !== "all" && selectedProfessionalData && (
        <CommissionAdjustmentModal
          open={adjustmentModalOpen}
          onOpenChange={setAdjustmentModalOpen}
          type={adjustmentModalType}
          professionalId={selectedProfessional}
          professionalName={selectedProfessionalData.name}
          createdByName={user?.email || null}
          onSubmit={createAdjustment}
          isSubmitting={isCreatingAdjustment}
        />
      )}

      <AlertDialog
        open={!!adjustmentToDelete}
        onOpenChange={(open) => { if (!open) setAdjustmentToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remover ajuste?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o {adjustmentToDelete?.label}? O total a pagar será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAdjustment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDeleteAdjustment(); }}
              disabled={isDeletingAdjustment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAdjustment ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutNew>
  );
}
