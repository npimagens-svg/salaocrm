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
import { Supplier } from "@/hooks/useSuppliers";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  suppliers: Supplier[];
}

export function StockEntryModal({ open, onOpenChange, products, suppliers }: StockEntryModalProps) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const isFractional = ["ml", "g", "dosagem", "cm"].includes(selectedProduct?.unit_of_measure || "");
  const unitLabel = selectedProduct?.unit_of_measure === "ml" ? "ml" : selectedProduct?.unit_of_measure === "g" ? "g" : selectedProduct?.unit_of_measure === "dosagem" ? "dose" : selectedProduct?.unit_of_measure === "cm" ? "cm" : "unidade(s)";

  useEffect(() => {
    if (open) {
      setSelectedProductId("");
      setQuantity(1);
      setCostPrice(0);
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedProduct) {
      setCostPrice(Number(selectedProduct.cost_price) || 0);
    }
  }, [selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !salonId) return;

    setIsLoading(true);
    try {
      const previousStock = selectedProduct.current_stock || 0;
      const newStock = previousStock + quantity;

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          current_stock: newStock,
          cost_price: costPrice // Update cost price if changed
        })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Record stock movement
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          salon_id: salonId,
          product_id: selectedProduct.id,
          movement_type: "entry",
          quantity: quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: notes || `Entrada manual de ${quantity} ${isFractional ? "unidade(s)" : "unidade(s)"}`,
        });

      if (movementError) throw movementError;

      queryClient.invalidateQueries({ queryKey: ["products", salonId] });
      
      toast({ 
        title: "Entrada registrada!", 
        description: `+${quantity} ${isFractional ? "unidade(s)" : "unidade(s)"} de ${selectedProduct.name}` 
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Erro ao registrar entrada", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const totalCost = quantity * costPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Entrada de Estoque
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
                  .filter(p => p.is_active)
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
                {isFractional && selectedProduct.current_stock_fractional > 0 && (
                  <p><strong>Fracionado aberto:</strong> {selectedProduct.current_stock_fractional} {unitLabel}</p>
                )}
                <p><strong>Custo atual:</strong> {formatCurrency(Number(selectedProduct.cost_price) || 0)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade (unidades)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Custo Unitário (R$)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Novo estoque:</span>
                  <span className="font-medium">{(selectedProduct.current_stock || 0) + quantity} unidade(s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Custo total desta entrada:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalCost)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: NF 12345, Compra de reposição..."
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
              disabled={isLoading || !selectedProductId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
