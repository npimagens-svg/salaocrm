import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Pencil, RotateCcw, Gift, AlertTriangle, ChevronDown, ChevronUp, FileText, Loader2, Printer, X } from "lucide-react";
import { Caixa } from "@/hooks/useCaixas";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface CaixaCardProps {
  caixa: Caixa;
  userName?: string;
  label?: string;
  onClose?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onReopen?: () => void;
  onRecalculate?: () => void;
  showCloseButton?: boolean;
  showEditButton?: boolean;
  showReopenButton?: boolean;
  isRecalculating?: boolean;
}

export function CaixaCard({
  caixa,
  userName,
  label,
  onClose,
  onView,
  onEdit,
  onReopen,
  onRecalculate,
  showCloseButton = false,
  showEditButton = false,
  showReopenButton = false,
  isRecalculating = false,
}: CaixaCardProps) {
  const [showComandas, setShowComandas] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const navigate = useNavigate();

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Fetch linked comandas (lazy)
  const { data: linkedComandas, isLoading: loadingComandas } = useQuery({
    queryKey: ["caixa-comandas", caixa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comandas")
        .select("id, total, closed_at, created_at, comanda_number, client:clients(name), professional:professionals(name), payments(payment_method, amount)")
        .eq("caixa_id", caixa.id)
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: showComandas || expandedMethod !== null,
  });

  // Fetch credits and debts
  const { data: caixaExtras } = useQuery({
    queryKey: ["caixa-extras", caixa.id],
    queryFn: async () => {
      const { data: comandas } = await supabase.from("comandas").select("id").eq("caixa_id", caixa.id);
      const ids = comandas?.map(c => c.id) || [];
      if (ids.length === 0) return { totalCredits: 0, totalDebts: 0 };
      const [cr, dr] = await Promise.all([
        supabase.from("client_credits").select("credit_amount").in("comanda_id", ids),
        supabase.from("client_debts" as any).select("debt_amount").in("comanda_id", ids),
      ]);
      return {
        totalCredits: (cr.data || []).reduce((s: number, c: any) => s + Number(c.credit_amount || 0), 0),
        totalDebts: (dr.data || []).reduce((s: number, d: any) => s + Number(d.debt_amount || 0), 0),
      };
    },
  });

  const totalReceived =
    (caixa.total_cash || 0) + (caixa.total_pix || 0) +
    (caixa.total_credit_card || 0) + (caixa.total_debit_card || 0) + (caixa.total_other || 0);

  const displayName = userName || caixa.profile?.full_name || "Usuário";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const totalCredits = caixaExtras?.totalCredits || 0;
  const totalDebts = caixaExtras?.totalDebts || 0;

  // Comandas filtered by payment method
  const getMethodComandas = (method: string) => {
    if (!linkedComandas) return [];
    return linkedComandas.filter((cmd: any) =>
      (cmd.payments || []).some((p: any) => p.payment_method === method)
    );
  };

  const methodLabels: Record<string, string> = {
    cash: "Dinheiro", pix: "PIX", credit_card: "Cartão Crédito",
    debit_card: "Cartão Débito", other: "Outros",
  };

  const paymentRows: { key: string; label: string; value: number }[] = [
    { key: "cash", label: "Dinheiro", value: caixa.total_cash || 0 },
    { key: "credit_card", label: "Cartão Crédito", value: caixa.total_credit_card || 0 },
    { key: "debit_card", label: "Cartão Débito", value: caixa.total_debit_card || 0 },
    { key: "pix", label: "PIX", value: caixa.total_pix || 0 },
    { key: "other", label: "Outros", value: caixa.total_other || 0 },
  ];

  return (
    <Card className="overflow-hidden text-sm">
      <CardContent className="p-0">
        {/* Avec-style Top: Avatar left + icons right */}
        <div className="flex items-start gap-3 p-4 pb-0">
          <Avatar className="h-12 w-12 shrink-0 mt-0.5">
            <AvatarImage src={caixa.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0" />
          {onView && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onView} title="Imprimir">
              <Printer className="h-3.5 w-3.5" />
            </Button>
          )}
          {showCloseButton && onClose && !caixa.closed_at && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={onClose} title="Fechar caixa">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Info lines — Avec style */}
        <div className="px-4 pt-1 pb-3 space-y-0.5 text-xs">
          <InfoLine bold label="Responsável" value={displayName} />
          {label && <span className="inline-block text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{label}</span>}
          <InfoLine label="Abertura" value={format(new Date(caixa.opened_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} />
          <InfoLine label="Fechamento" value={caixa.closed_at ? format(new Date(caixa.closed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : ""} />
          <InfoLine label="Valor Inicial (Dinheiro)" value={fmt(caixa.opening_balance || 0)} />
        </div>

        {/* Divider + Two columns: Sangrias & Total em Caixa */}
        <div className="border-t mx-4" />
        <div className="grid grid-cols-2 gap-0 px-4 pt-2 pb-3">
          {/* Left: Sangrias */}
          <div className="pr-3 border-r">
            <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sangr & Supr</h6>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Sangrias e Suprimentos</p>
            <p className="text-[10px] text-muted-foreground italic">Nenhuma movimentação</p>
          </div>

          {/* Right: Total em Caixa */}
          <div className="pl-3">
            <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total em Caixa</h6>
            <div className="space-y-0.5 text-xs">
              {paymentRows.map(({ key, label, value }) => (
                <div key={key}>
                  <button
                    type="button"
                    className="flex justify-between w-full hover:bg-muted/50 rounded px-0.5 -mx-0.5 transition-colors"
                    onClick={() => setExpandedMethod(expandedMethod === key ? null : key)}
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className={value > 0 ? "font-medium" : ""}>{fmt(value)}</span>
                  </button>
                  {/* Expanded: show comandas for this method */}
                  {expandedMethod === key && (
                    <div className="ml-2 mt-0.5 mb-1 space-y-0.5 border-l-2 border-primary/30 pl-2">
                      {loadingComandas ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : getMethodComandas(key).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">Sem comandas</p>
                      ) : (
                        getMethodComandas(key).map((cmd: any) => {
                          const methodAmount = (cmd.payments || [])
                            .filter((p: any) => p.payment_method === key)
                            .reduce((s: number, p: any) => s + Number(p.amount), 0);
                          return (
                            <button
                              key={cmd.id}
                              type="button"
                              className="flex justify-between w-full text-[10px] hover:text-primary transition-colors"
                              onClick={() => navigate(`/comandas?comanda=${cmd.id}`)}
                            >
                              <span className="truncate mr-1">{(cmd.client as any)?.name || "Avulso"}</span>
                              <span className="shrink-0 font-medium">{fmt(methodAmount)}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Valor inicial sub-line */}
              <div className="flex justify-between pl-3 text-[10px] text-muted-foreground">
                <span>Valor Inicial (S)</span>
                <span>{fmt(caixa.opening_balance || 0)}</span>
              </div>

              {/* TOTAL FATURADO */}
              <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-xs">
                <span>TOTAL FATURADO</span>
                <span>{fmt(totalReceived)}</span>
              </div>

              {/* Extras */}
              {totalCredits > 0 && (
                <div className="flex justify-between text-[10px] text-green-600">
                  <span>Créditos</span>
                  <span>{fmt(totalCredits)}</span>
                </div>
              )}
              {totalDebts > 0 && (
                <div className="flex justify-between text-[10px] text-destructive">
                  <span>Dívidas</span>
                  <span>-{fmt(totalDebts)}</span>
                </div>
              )}

              {caixa.closed_at && caixa.closing_balance !== null && (
                <>
                  <div className="border-t pt-1 mt-1" />
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Declarado</span>
                    <span>{fmt(caixa.closing_balance)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-xs">
                    <span>TOTAL</span>
                    <span>{fmt(totalReceived)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comandas accordion */}
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowComandas(prev => !prev)}
            className="flex items-center gap-1.5 w-full text-left text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <FileText className="h-3 w-3" />
            Comandas
            <span className="ml-auto">
              {showComandas ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          </button>
          {showComandas && (
            <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
              {loadingComandas ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mx-auto my-2" />
              ) : !linkedComandas || linkedComandas.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic py-1">Nenhuma comanda.</p>
              ) : (
                linkedComandas.map((cmd: any) => (
                  <button
                    key={cmd.id}
                    type="button"
                    className="flex justify-between w-full text-[10px] hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                    onClick={() => navigate(`/comandas?comanda=${cmd.id}`)}
                  >
                    <span className="truncate mr-2">
                      #{cmd.comanda_number ? String(cmd.comanda_number).padStart(4, "0") : "—"} {(cmd.client as any)?.name || "Avulso"}
                    </span>
                    <span className="shrink-0 font-medium text-primary">{fmt(cmd.total || 0)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Avec-style Bottom Buttons */}
        <div className="flex gap-2 px-4 pb-3 pt-1 border-t">
          {onRecalculate && (
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 gap-1" onClick={onRecalculate} disabled={isRecalculating}>
              {isRecalculating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Recalcular
            </Button>
          )}
          {showReopenButton && onReopen && caixa.closed_at && (
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 gap-1 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={onReopen}>
              <RotateCcw className="h-3 w-3" /> Reabrir
            </Button>
          )}
          {showEditButton && onEdit && !caixa.closed_at && (
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 gap-1" onClick={onEdit}>
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          )}
          {onView && (
            <Button size="sm" className="flex-1 text-[10px] h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={onView}>
              <Eye className="h-3 w-3" /> Detalhes
            </Button>
          )}
          {showCloseButton && onClose && !caixa.closed_at && (
            <Button size="sm" variant="destructive" className="flex-1 text-[10px] h-8 gap-1" onClick={onClose}>
              Fechar Caixa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <p className="truncate">
      <span className={`${bold ? "font-semibold" : "font-medium"} text-foreground`}>{label}:</span>{" "}
      <span className="text-muted-foreground">{value || "—"}</span>
    </p>
  );
}
