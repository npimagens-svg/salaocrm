import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StockDeductionItem {
  serviceId: string;
  quantity: number; // how many times the service was performed
}

export interface KitDeductionItem {
  kitId: string;
  quantity: number; // how many kits sold in the comanda
}

export interface KitStockError {
  productName: string;
  productId: string;
  required: number;
  available: number;
  unit: string;
  kitName: string;
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

  /**
   * Baixa de estoque pra KITS vendidos na comanda.
   *
   * Diferente de serviços, kits usam pré-check ALL-OR-NOTHING:
   * - Primeiro valida que TODOS os produtos do kit têm estoque suficiente
   * - Se qualquer um faltar, throw com lista pra UI exibir e abortar fechamento
   * - Só baixa se tudo OK (evita estoque parcial inconsistente)
   */
  const deductStockForKits = async (
    kitItems: KitDeductionItem[],
    options: { dryRun?: boolean } = {}
  ) => {
    if (!salonId) throw new Error("Salão não encontrado");
    if (kitItems.length === 0) return [];
    const { dryRun = false } = options;

    // 1. Carregar kits com seus produtos (1 query)
    const kitIds = kitItems.map((k) => k.kitId);
    const { data: kits, error: kitsError } = await supabase
      .from("product_kits")
      .select(
        `id, name, product_kit_items(quantity, product:products(id, name, current_stock, current_stock_fractional, unit_of_measure, unit_quantity))`
      )
      .in("id", kitIds);

    if (kitsError) throw kitsError;
    if (!kits || kits.length === 0) return [];

    // 2. Consolidar demanda total por produto (mesmo produto em kits diferentes soma)
    interface Demand {
      productId: string;
      productName: string;
      product: any;
      totalNeeded: number; // em unidade-base (ml/g se fracional, unidades se discreto)
      kitName: string; // nome do PRIMEIRO kit que pediu (pra mensagem de erro)
    }
    const demands = new Map<string, Demand>();

    for (const kit of kits) {
      const kitItem = kitItems.find((ki) => ki.kitId === kit.id);
      if (!kitItem) continue;

      const kitMultiplier = kitItem.quantity; // quantos kits foram vendidos
      const components = (kit as any).product_kit_items || [];

      for (const comp of components) {
        if (!comp.product) continue;
        const totalForThisKit = Number(comp.quantity) * kitMultiplier;
        const existing = demands.get(comp.product.id);

        if (existing) {
          existing.totalNeeded += totalForThisKit;
        } else {
          demands.set(comp.product.id, {
            productId: comp.product.id,
            productName: comp.product.name,
            product: comp.product,
            totalNeeded: totalForThisKit,
            kitName: kit.name,
          });
        }
      }
    }

    // 3. PRÉ-CHECK: valida estoque de TODOS antes de baixar qualquer um
    const errors: KitStockError[] = [];
    for (const [, d] of demands) {
      const isFractional = ["ml", "g", "dosagem", "cm"].includes(
        d.product.unit_of_measure || ""
      );
      const currentFractional = Number(d.product.current_stock_fractional) || 0;
      const currentUnits = Number(d.product.current_stock) || 0;
      const unitQuantity = Number(d.product.unit_quantity) || 1;

      // Estoque "total disponível" em unidade base
      // - fracional: fractional_atual + (unidades * unit_quantity)
      // - discreto: só current_stock
      const totalAvailable = isFractional
        ? currentFractional + currentUnits * unitQuantity
        : currentUnits;

      if (totalAvailable < d.totalNeeded) {
        errors.push({
          productName: d.productName,
          productId: d.productId,
          required: d.totalNeeded,
          available: totalAvailable,
          unit: d.product.unit_of_measure || "unidade",
          kitName: d.kitName,
        });
      }
    }

    if (errors.length > 0) {
      // Constrói mensagem detalhada pra UI
      const detail = errors
        .map(
          (e) =>
            `• Kit "${e.kitName}": ${e.productName} requer ${e.required}${e.unit}, há ${e.available}${e.unit}`
        )
        .join("\n");
      const err = new Error(
        `Estoque insuficiente pra fechar a comanda:\n${detail}`
      );
      (err as any).kitStockErrors = errors;
      throw err;
    }

    // Modo dryRun: apenas validou, retorna sem baixar nada
    if (dryRun) return [];

    // 4. BAIXA todos os produtos (com lógica fracional/unitário existente)
    const movements: {
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
    }[] = [];

    for (const [, d] of demands) {
      const isFractional = ["ml", "g", "dosagem", "cm"].includes(
        d.product.unit_of_measure || ""
      );
      const totalQuantityUsed = d.totalNeeded;
      const currentFractional = Number(d.product.current_stock_fractional) || 0;
      const currentUnits = Number(d.product.current_stock) || 0;
      const unitQuantity = Number(d.product.unit_quantity) || 1;

      if (isFractional) {
        let newFractional = currentFractional - totalQuantityUsed;
        let newUnits = currentUnits;

        if (newFractional < 0) {
          const unitsNeeded = Math.ceil(Math.abs(newFractional) / unitQuantity);
          newUnits = Math.max(0, currentUnits - unitsNeeded);
          newFractional = unitsNeeded * unitQuantity + newFractional;
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({
            current_stock: newUnits,
            current_stock_fractional: Math.max(0, newFractional),
          })
          .eq("id", d.productId);

        if (updateError) {
          console.error("Error updating fractional stock (kit):", updateError);
          continue;
        }

        await supabase.from("stock_movements").insert({
          salon_id: salonId,
          product_id: d.productId,
          movement_type: "exit",
          quantity: Math.round(totalQuantityUsed),
          previous_stock: currentUnits,
          new_stock: newUnits,
          notes: `Baixa automática - kit "${d.kitName}" (${totalQuantityUsed}${d.product.unit_of_measure})`,
        });

        movements.push({
          productId: d.productId,
          productName: d.productName,
          quantity: totalQuantityUsed,
          unit: d.product.unit_of_measure,
        });
      } else {
        const newStock = Math.max(0, currentUnits - totalQuantityUsed);

        const { error: updateError } = await supabase
          .from("products")
          .update({ current_stock: newStock })
          .eq("id", d.productId);

        if (updateError) {
          console.error("Error updating unit stock (kit):", updateError);
          continue;
        }

        await supabase.from("stock_movements").insert({
          salon_id: salonId,
          product_id: d.productId,
          movement_type: "exit",
          quantity: totalQuantityUsed,
          previous_stock: currentUnits,
          new_stock: newStock,
          notes: `Baixa automática - kit "${d.kitName}" (${totalQuantityUsed} un)`,
        });

        movements.push({
          productId: d.productId,
          productName: d.productName,
          quantity: totalQuantityUsed,
          unit: "unidade(s)",
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["products", salonId] });
    return movements;
  };

  const deductKitMutation = useMutation({
    mutationFn: deductStockForKits,
    onError: (error: Error) => {
      console.error("Kit stock deduction error:", error);
    },
  });

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
    // Kits
    deductStockForKits,
    deductKitStock: deductKitMutation.mutateAsync,
    isDeductingKit: deductKitMutation.isPending,
  };
}
