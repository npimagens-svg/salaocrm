import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StockDeductionItem {
  serviceId: string;
  quantity: number; // how many times the service was performed
}

export function useStockMovements() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Deduct stock for services performed in a comanda
  const deductStockForServices = async (items: StockDeductionItem[]) => {
    if (!salonId) throw new Error("Salão não encontrado");

    // Get all service-product relationships for the given services
    const serviceIds = items.map(i => i.serviceId);
    const { data: serviceProducts, error: spError } = await supabase
      .from("service_products")
      .select(`
        *,
        product:products(
          id, 
          name, 
          current_stock, 
          current_stock_fractional, 
          unit_of_measure, 
          unit_quantity
        )
      `)
      .in("service_id", serviceIds);

    if (spError) throw spError;
    if (!serviceProducts || serviceProducts.length === 0) return [];

    const movements: { productId: string; productName: string; quantity: number; unit: string }[] = [];

    // Process each service-product relationship
    for (const sp of serviceProducts) {
      const serviceItem = items.find(i => i.serviceId === sp.service_id);
      if (!serviceItem || !sp.product) continue;

      const product = sp.product;
      const totalQuantityUsed = Number(sp.quantity_per_use) * serviceItem.quantity;
      const isFractional = ['ml', 'g', 'dosagem', 'cm'].includes(product.unit_of_measure || '');

      if (isFractional) {
        // Fractional stock deduction (ml/g)
        const currentFractional = Number(product.current_stock_fractional) || 0;
        const currentUnits = Number(product.current_stock) || 0;
        const unitQuantity = Number(product.unit_quantity) || 1;
        
        // Calculate new fractional stock
        let newFractional = currentFractional - totalQuantityUsed;
        let newUnits = currentUnits;

        // If fractional goes negative, deduct from units
        if (newFractional < 0) {
          // Need to open a new unit
          const unitsNeeded = Math.ceil(Math.abs(newFractional) / unitQuantity);
          newUnits = Math.max(0, currentUnits - unitsNeeded);
          newFractional = (unitsNeeded * unitQuantity) + newFractional;
        }

        // Update product stock
        const { error: updateError } = await supabase
          .from("products")
          .update({
            current_stock: newUnits,
            current_stock_fractional: Math.max(0, newFractional),
          })
          .eq("id", product.id);

        if (updateError) {
          console.error("Error updating fractional stock:", updateError);
          continue;
        }

        // Record stock movement
        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            salon_id: salonId,
            product_id: product.id,
            movement_type: "exit",
            quantity: Math.round(totalQuantityUsed), // Store as integer for movement log
            previous_stock: currentUnits,
            new_stock: newUnits,
            notes: `Baixa automática - ${totalQuantityUsed}${product.unit_of_measure} utilizado(s) em serviço`,
          });

        if (movementError) {
          console.error("Error recording stock movement:", movementError);
        }

        movements.push({
          productId: product.id,
          productName: product.name,
          quantity: totalQuantityUsed,
          unit: product.unit_of_measure,
        });
      } else {
        // Unit-based stock deduction
        const currentStock = Number(product.current_stock) || 0;
        const newStock = Math.max(0, currentStock - totalQuantityUsed);

        const { error: updateError } = await supabase
          .from("products")
          .update({ current_stock: newStock })
          .eq("id", product.id);

        if (updateError) {
          console.error("Error updating unit stock:", updateError);
          continue;
        }

        // Record stock movement
        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            salon_id: salonId,
            product_id: product.id,
            movement_type: "exit",
            quantity: totalQuantityUsed,
            previous_stock: currentStock,
            new_stock: newStock,
            notes: `Baixa automática - ${totalQuantityUsed} unidade(s) utilizada(s) em serviço`,
          });

        if (movementError) {
          console.error("Error recording stock movement:", movementError);
        }

        movements.push({
          productId: product.id,
          productName: product.name,
          quantity: totalQuantityUsed,
          unit: "unidade(s)",
        });
      }
    }

    // Invalidate products query to refresh stock display
    queryClient.invalidateQueries({ queryKey: ["products", salonId] });

    return movements;
  };

  const deductStockMutation = useMutation({
    mutationFn: deductStockForServices,
    onSuccess: (movements) => {
      if (movements.length > 0) {
        console.log("Stock deducted:", movements);
      }
    },
    onError: (error: Error) => {
      console.error("Stock deduction error:", error);
      toast({ 
        title: "Aviso: Erro na baixa de estoque", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return {
    deductStockForServices,
    deductStock: deductStockMutation.mutateAsync,
    isDeducting: deductStockMutation.isPending,
  };
}
