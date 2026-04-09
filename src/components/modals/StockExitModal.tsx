import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/hooks/useProducts";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Minus, AlertTriangle } from "lucide-react";

interface StockExitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

const EXIT_REASONS = [
  { value: "manual", label: "Saída Manual" },
  { value: "loss", label: "Perda/Quebra" },
  { value: "expired", label: "Vencido" },
  { value: "adjustment", label: "Ajuste de Inventário" },
  { value: "sample", label: "Amostra/Brinde" },
  { value: "other", label: "Outro" },
];

export function StockExitModal({ open, onOpenChange, products }: StockExitModalProps) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [exitType, setExitType] = useState<"unit" | "fractional">("unit");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("manual");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const isFractional = ["ml", "g", "dosagem", "cm"].includes(selectedProduct?.unit_of_measure || "");
  const unitLabel = selectedProduct?.unit_of_measure === "ml" ? "ml" : selectedProduct?.unit_of_measure === "g" ? "g" : selectedProduct?.unit_of_measure === "dosagem" ? "dose" : selectedProduct?.unit_of_measure === "cm" ? "cm" : "unidade(s)";

  useEffect(() => {
    if (open) {
      setSelectedProductId("");
      setExitType("unit");
      setQuantity(1);
      setReason("manual");
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedProduct) {
      setExitType(isFractional ? "fractional" : "unit");
    }
  }, [selectedProduct, isFractional]);

  const calculateNewStock = () => {
    if (!selectedProduct) return { newStock: 0, newFractional: 0, valid: false };

    const currentStock = selectedProduct.current_stock || 0;
    const currentFractional = Number(selectedProduct.current_stock_fractional) || 0;
    const unitQuantity = Number(selectedProduct.unit_quantity) || 1;

    if (exitType === "unit") {
      const newStock = currentStock - quantity;
      return { 
        newStock: Math.max(0, newStock), 
        newFractional: currentFractional, 
        valid: newStock >= 0 
      };
    } else {
      // Fractional exit
      let newFractional = currentFractional - quantity;
      let newStock = currentStock;

      if (newFractional < 0) {
        // Need to open a new unit
        const unitsNeeded = Math.ceil(Math.abs(newFractional) / unitQuantity);
        newStock = currentStock - unitsNeeded;
        newFractional = (unitsNeeded * unitQuantity) + newFractional;
      }

      return { 
        newStock: Math.max(0, newStock), 
        newFractional: Math.max(0, newFractional), 
        valid: newStock >= 0 || (newStock === 0 && newFractional >= 0)
      };
    }
  };

  const stockCalc = calculateNewStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !salonId) return;

    if (!stockCalc.valid) {
      toast({ 
        title: "Estoque insuficiente", 
        description: "Não há estoque suficiente para esta saída", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const previousStock = selectedProduct.current_stock || 0;
      const reasonLabel = EXIT_REASONS.find(r => r.value === reason)?.label || reason;

      // Update product stock
      const updateData: Record<string, any> = { 
        current_stock: stockCalc.newStock
      };

      if (isFractional) {
        updateData.current_stock_fractional = stockCalc.newFractional;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Record stock movement
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          salon_id: salonId,
          product_id: selectedProduct.id,
          movement_type: "exit",
          quantity: exitType === "unit" ? quantity : Math.round(quantity),
          previous_stock: previousStock,
          new_stock: stockCalc.newStock,
          notes: `${reasonLabel}${notes ? `: ${notes}` : ""} - ${quantity} ${exitType === "unit" ? "unidade(s)" : unitLabel}`,
        });

      if (movementError) throw movementError;

      queryClient.invalidateQueries({ queryKey: ["products", salonId] });
      
      toast({ 
        title: "Saída registrada!", 
        description: `-${quantity} ${exitType === "unit" ? "unidade(s)" : unitLabel} de ${selectedProduct.name}` 
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Erro ao registrar saída", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalFractionalStock = () => {
    if (!selectedProduct) return 0;
    const currentStock = selectedProduct.current_stock || 0;
    const currentFractional = Number(selectedProduct.current_stock_fractional) || 0;
    const unitQuantity = Number(selectedProduct.unit_quantity) || 1;
    return (currentStock * unitQuantity) + currentFractional;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-600" />
            Saída Manual de Estoque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter(p => p.is_active && (p.current_stock || 0) > 0)
                  .map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{product.name}</span>
                        <span className="text-muted-foreground text-xs">
                          (Estoque: {product.current_stock || 0})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p><strong>Produto:</strong> {selectedProduct.name}</p>
                <p><strong>Estoque atual:</strong> {selectedProduct.current_stock || 0} unidade(s)</p>
                {isFractional && (
                  <>
                    {Number(selectedProduct.current_stock_fractional) > 0 && (
                      <p><strong>Fracionado aberto:</strong> {selectedProduct.current_stock_fractional} {unitLabel}</p>
                    )}
                    <p><strong>Total disponível:</strong> {getTotalFractionalStock().toLocaleString("pt-BR")} {unitLabel}</p>
                  </>
                )}
              </div>

              {isFractional && (
                <div className="space-y-2">
                  <Label>Tipo de Saída</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={exitType === "unit" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => { setExitType("unit"); setQuantity(1); }}
                    >
                      Por Unidade
                    </Button>
                    <Button
                      type="button"
                      variant={exitType === "fractional" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => { setExitType("fractional"); setQuantity(10); }}
                    >
                      Por {unitLabel.toUpperCase()}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantidade ({exitType === "unit" ? "unidades" : unitLabel})
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    step={exitType === "unit" ? 1 : 0.1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXIT_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!stockCalc.valid && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Estoque insuficiente para esta quantidade</span>
                </div>
              )}

              {stockCalc.valid && (
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Novo estoque:</span>
                    <span className="font-medium">{stockCalc.newStock} unidade(s)</span>
                  </div>
                  {isFractional && (
                    <div className="flex justify-between">
                      <span>Fracionado restante:</span>
                      <span className="font-medium">{stockCalc.newFractional.toFixed(1)} {unitLabel}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedProductId || !stockCalc.valid}
              variant="destructive"
            >
              {isLoading ? "Registrando..." : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
