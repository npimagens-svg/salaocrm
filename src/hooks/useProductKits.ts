import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook CRUD pra Kits de Produtos.
 *
 * Kit = agregado virtual de N produtos com desconto único. Vendido como linha
 * única na comanda (item_type='kit'), estoque baixa nos SKUs individuais
 * (lógica em useStockMovements), comissão é rateada via products.commission_percent.
 *
 * Espelha o padrão de usePackages (que é pacote de SERVIÇOS — não confundir).
 */

export interface KitItemProduct {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  current_stock: number;
  unit_of_measure: string;
}

export interface ProductKitItem {
  id: string;
  kit_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: KitItemProduct;
}

export interface ProductKit {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_kit_items?: ProductKitItem[];
}

export interface ProductKitInput {
  name: string;
  description?: string;
  discount_percent: number;
  is_active?: boolean;
  items: {
    product_id: string;
    quantity: number;
  }[];
}

export function useProductKits() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["product-kits", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("product_kits")
        .select(
          "*, product_kit_items(*, product:products(id, name, sale_price, cost_price, current_stock, unit_of_measure))"
        )
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data as ProductKit[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProductKitInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      if (input.items.length === 0) {
        throw new Error("Adicione ao menos 1 produto ao kit");
      }

      const { items, ...kitData } = input;
      const { data: kit, error: kitError } = await supabase
        .from("product_kits")
        .insert({ ...kitData, salon_id: salonId })
        .select()
        .single();
      if (kitError) throw kitError;

      const itemRows = items.map((item) => ({
        kit_id: kit.id,
        product_id: item.product_id,
        quantity: item.quantity,
      }));
      const { error: itemsError } = await supabase
        .from("product_kit_items")
        .insert(itemRows);
      if (itemsError) {
        // Rollback: remove o kit órfão (sem itens) pra evitar lixo
        await supabase.from("product_kits").delete().eq("id", kit.id);
        throw itemsError;
      }

      return kit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-kits", salonId] });
      toast({ title: "Kit criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar kit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ProductKitInput & { id: string }) => {
      const { items, ...kitData } = input;
      if (items.length === 0) {
        throw new Error("O kit precisa ter ao menos 1 produto");
      }

      const { data: kit, error: kitError } = await supabase
        .from("product_kits")
        .update(kitData)
        .eq("id", id)
        .select()
        .single();
      if (kitError) throw kitError;

      // Substituição completa dos itens (igual usePackages faz)
      const { error: delError } = await supabase
        .from("product_kit_items")
        .delete()
        .eq("kit_id", id);
      if (delError) throw delError;

      const itemRows = items.map((item) => ({
        kit_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
      }));
      const { error: itemsError } = await supabase
        .from("product_kit_items")
        .insert(itemRows);
      if (itemsError) throw itemsError;

      return kit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-kits", salonId] });
      toast({ title: "Kit atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar kit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_kits")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-kits", salonId] });
      toast({ title: "Kit removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover kit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_kits")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-kits", salonId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status do kit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    kits: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createKit: createMutation.mutate,
    updateKit: updateMutation.mutate,
    deleteKit: deleteMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook auxiliar pra buscar apenas kits ATIVOS (usado no seletor da comanda).
 * Otimização: select reduzido + ordem por nome.
 */
export function useActiveProductKits() {
  const { salonId } = useAuth();

  return useQuery({
    queryKey: ["product-kits-active", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("product_kits")
        .select(
          "id, name, description, discount_percent, product_kit_items(quantity, product:products(id, name, sale_price, cost_price, current_stock, current_stock_fractional, unit_of_measure, unit_quantity))"
        )
        .eq("salon_id", salonId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!salonId,
  });
}
