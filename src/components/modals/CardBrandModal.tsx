import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CardBrand, CardBrandInput } from "@/hooks/useCardBrands";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CardBrandModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CardBrandInput) => void;
  cardBrand?: CardBrand | null;
  isLoading?: boolean;
}

const INSTALLMENTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function CardBrandModal({ open, onClose, onSave, cardBrand, isLoading }: CardBrandModalProps) {
  const [name, setName] = useState("");
  const [debitFeePercent, setDebitFeePercent] = useState("");
  const [creditFeePercent, setCreditFeePercent] = useState("");
  const [installmentFees, setInstallmentFees] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (cardBrand) {
      setName(cardBrand.name);
      setDebitFeePercent(String(cardBrand.debit_fee_percent));
      setCreditFeePercent(String(cardBrand.credit_fee_percent));
      setIsActive(cardBrand.is_active);

      // Load per-installment fees
      const fees: Record<string, string> = {};
      if (cardBrand.credit_installment_fees && Object.keys(cardBrand.credit_installment_fees).length > 0) {
        INSTALLMENTS.forEach(n => {
          fees[String(n)] = String(cardBrand.credit_installment_fees?.[String(n)] ?? "");
        });
      } else {
        // Migrate from range-based to individual (pre-fill with range values)
        INSTALLMENTS.forEach(n => {
          let val = 0;
          if (n <= 6) val = cardBrand.credit_2_6_fee_percent || 0;
          else if (n <= 12) val = cardBrand.credit_7_12_fee_percent || 0;
          fees[String(n)] = val > 0 ? String(val) : "";
        });
      }
      setInstallmentFees(fees);
    } else {
      setName("");
      setDebitFeePercent("");
      setCreditFeePercent("");
      setInstallmentFees({});
      setIsActive(true);
    }
  }, [cardBrand, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build installment fees object
    const creditInstallmentFees: Record<string, number> = {};
    INSTALLMENTS.forEach(n => {
      const val = parseFloat(installmentFees[String(n)] || "0");
      if (val > 0) creditInstallmentFees[String(n)] = val;
    });

    // Also populate range fields for backward compatibility
    const fee2 = parseFloat(installmentFees["2"] || "0");
    const fee6 = parseFloat(installmentFees["6"] || "0");
    const fee7 = parseFloat(installmentFees["7"] || "0");
    const fee12 = parseFloat(installmentFees["12"] || "0");

    onSave({
      name,
      debit_fee_percent: parseFloat(debitFeePercent) || 0,
      credit_fee_percent: parseFloat(creditFeePercent) || 0,
      credit_2_6_fee_percent: fee6 || fee2,
      credit_7_12_fee_percent: fee12 || fee7,
      credit_13_18_fee_percent: 0,
      credit_installment_fees: creditInstallmentFees,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {cardBrand ? "Editar Maquininha / Bandeira" : "Nova Maquininha / Bandeira"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <form id="card-brand-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: PagBank, Stone, Cielo..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debitFee">Débito (%)</Label>
                <Input
                  id="debitFee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={debitFeePercent}
                  onChange={(e) => setDebitFeePercent(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditFee">Crédito à vista (%)</Label>
                <Input
                  id="creditFee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={creditFeePercent}
                  onChange={(e) => setCreditFeePercent(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <Separator />
            <Label className="text-sm font-semibold text-muted-foreground">Crédito Parcelado — Taxa por parcela</Label>
            <p className="text-xs text-muted-foreground">Informe a taxa total cobrada pela maquininha para cada número de parcelas.</p>

            <div className="grid grid-cols-3 gap-3">
              {INSTALLMENTS.map((n) => (
                <div key={n} className="space-y-1">
                  <Label htmlFor={`inst-${n}`} className="text-xs">{n}x (%)</Label>
                  <Input
                    id={`inst-${n}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={installmentFees[String(n)] || ""}
                    onChange={(e) => setInstallmentFees(prev => ({ ...prev, [String(n)]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="isActive">Ativa</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="card-brand-form" disabled={isLoading || !name.trim()}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
