import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Check, Trash2, ChevronDown, ChevronUp, Search, Save } from "lucide-react";
import { useAllServiceProducts } from "@/hooks/useServiceProducts";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface ProductUsage {
  id: string;
  product_id: string;
  product_name: string;
  quantity_units: number;
  quantity_fractional: number;
  unit_of_measure: string;
  unit_quantity: number;
  cost_per_unit: number;
  total_cost: number;
  isNew?: boolean;
}

interface ComandaServiceProductsProps {
  serviceId: string;
  serviceName: string;
  quantity: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onProductUsageChange: (serviceId: string, products: ProductUsage[]) => void;
  disabled?: boolean;
  savedProductCost?: number;
}

export function ComandaServiceProducts({
  serviceId,
  serviceName,
  quantity,
  isExpanded,
  onToggleExpand,
  onProductUsageChange,
  disabled = false,
  savedProductCost = 0,
}: ComandaServiceProductsProps) {
  const { getProductsForService } = useAllServiceProducts();
  const { products: allProducts } = useProducts();
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");
  const [newProductQty, setNewProductQty] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Get selected product info for the add form
  const selectedNewProduct = allProducts.find(p => p.id === newProductId);
  const selectedProductIsFractional = selectedNewProduct && ["ml", "g", "dosagem", "cm"].includes(selectedNewProduct.unit_of_measure || "");

  // Initialize products from service configuration (only once)
  useEffect(() => {
    if (initialized) return;
    
    const serviceProducts = getProductsForService(serviceId);
    if (serviceProducts.length > 0 || allProducts.length > 0) {
      const initialProducts: ProductUsage[] = serviceProducts.map((sp) => {
        const isFractional = ["ml", "g", "dosagem", "cm"].includes(sp.product?.unit_of_measure || "");
        const fractionalAmount = sp.quantity_per_use * quantity;
        const costPerUnit = (sp.product?.cost_price || 0) / (sp.product?.unit_quantity || 1);
        
        return {
          id: sp.id,
          product_id: sp.product_id,
          product_name: sp.product?.name || "Produto",
          quantity_units: 0,
          quantity_fractional: isFractional ? fractionalAmount : sp.quantity_per_use * quantity,
          unit_of_measure: sp.product?.unit_of_measure || "unidade",
          unit_quantity: sp.product?.unit_quantity || 1,
          cost_per_unit: costPerUnit,
          total_cost: costPerUnit * fractionalAmount,
        };
      });
      setProductUsages(initialProducts);
      setInitialized(true);
    }
  }, [serviceId, quantity, getProductsForService, allProducts.length, initialized]);

  // Save products explicitly — only called by user action
  const saveProducts = useCallback(() => {
    onProductUsageChange(serviceId, productUsages);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onToggleExpand();
    }, 800);
  }, [serviceId, productUsages, onProductUsageChange, onToggleExpand]);

  // Auto-save on initialization to ensure product_cost is always set
  useEffect(() => {
    if (initialized && productUsages.length > 0 && !isDirty) {
      onProductUsageChange(serviceId, productUsages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  const updateProductUsage = (productId: string, field: 'quantity_units' | 'quantity_fractional', value: number) => {
    setProductUsages(prev => prev.map(p => {
      if (p.product_id !== productId) return p;
      const updated = { ...p, [field]: value };
      // Recalculate total based on fractional usage
      const isFrac = ["ml", "g", "dosagem", "cm"].includes(p.unit_of_measure);
      if (isFrac) {
        // Total cost = full units cost + fractional cost
        const fullUnitsCost = updated.quantity_units * (p.cost_per_unit * p.unit_quantity);
        const fractionalCost = p.cost_per_unit * updated.quantity_fractional;
        updated.total_cost = fullUnitsCost + fractionalCost;
      } else {
        // For unit-based products
        updated.total_cost = (p.cost_per_unit * p.unit_quantity) * updated.quantity_units;
      }
      return updated;
    }));
    setIsDirty(true);
    setIsSaved(false);
  };

  const removeProduct = (productId: string) => {
    setProductUsages(prev => prev.filter(p => p.product_id !== productId));
    setIsDirty(true);
    setIsSaved(false);
  };

  const handleAddProduct = () => {
    if (!newProductId) return;
    
    const product = allProducts.find(p => p.id === newProductId);
    if (!product) return;

    const isFrac = ["ml", "g", "dosagem", "cm"].includes(product.unit_of_measure || "");
    const costPerUnit = (product.cost_price || 0) / (product.unit_quantity || 1);
    
    const newUsage: ProductUsage = {
      id: `new_${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      quantity_units: isFrac ? 0 : newProductQty,
      quantity_fractional: isFrac ? newProductQty : 0,
      unit_of_measure: product.unit_of_measure || "unidade",
      unit_quantity: product.unit_quantity || 1,
      cost_per_unit: costPerUnit,
      total_cost: isFrac 
        ? costPerUnit * newProductQty 
        : (costPerUnit * (product.unit_quantity || 1)) * newProductQty,
      isNew: true,
    };

    setProductUsages(prev => [...prev, newUsage]);
    setNewProductId("");
    setNewProductQty(1);
    setIsAddingProduct(false);
    setIsDirty(true);
    setIsSaved(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      ml: "ml",
      g: "g",
      dosagem: "dose",
      unidade: "un",
      cm: "cm",
      caixa: "cx",
      pacote: "pct",
    };
    return labels[unit] || unit;
  };

  const isFractionalUnit = (unit: string) => ["ml", "g", "dosagem", "cm"].includes(unit);

  // Filter available products (not already in list) - show ONLY internal use products (is_for_consumption)
  const availableProducts = allProducts.filter(p => 
    p.is_active && 
    p.is_for_consumption &&
    !productUsages.some(pu => pu.product_id === p.id)
  );

  const totalProductCost = productUsages.reduce((acc, p) => acc + p.total_cost, 0);

  return (
    <div className="border-l-4 border-primary/30 pl-4 py-3 bg-muted/30 mx-2 mb-2 rounded-r-md">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Package className="h-4 w-4" />
        <span>Saídas no estoque (opcional)</span>
        <span className="ml-auto mr-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
          {productUsages.length} produto{productUsages.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground mr-2">
          {formatCurrency(totalProductCost)}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Product list - only when expanded */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Show saved cost info when products don't match */}
          {savedProductCost > 0 && productUsages.length === 0 && (
            <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-sm">
              <span className="font-medium text-amber-800">Custo registrado: {formatCurrency(savedProductCost)}</span>
              <p className="text-xs text-amber-600 mt-1">
                Produtos foram lançados anteriormente mas o serviço não possui produtos configurados. Adicione os produtos manualmente abaixo.
              </p>
            </div>
          )}
          {savedProductCost > 0 && productUsages.length > 0 && Math.abs(totalProductCost - savedProductCost) > 0.01 && (
            <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
              Custo registrado na comanda: {formatCurrency(savedProductCost)} • Custo calculado: {formatCurrency(totalProductCost)}
              {!disabled && " — Clique em Salvar para atualizar"}
            </div>
          )}

          {productUsages.length === 0 && savedProductCost === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              Nenhum produto vinculado a este serviço. Clique em "Adicionar Produto" para incluir.
            </p>
          ) : (
            productUsages.map((product) => (
              <div 
                key={product.id} 
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md bg-background border",
                  product.isNew && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="flex-1 text-sm font-medium truncate max-w-[160px]" title={product.product_name}>
                  {product.product_name}
                </span>
                
                {isFractionalUnit(product.unit_of_measure) ? (
                  // Fractional product (ml, g, dosagem) - show units + fractional
                  <>
                    <Input
                      type="number"
                      min="0"
                      className="w-14 h-8 text-center text-sm"
                      value={product.quantity_units}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_units', parseInt(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">un</span>
                    <span className="text-muted-foreground font-bold">+</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-16 h-8 text-center text-sm"
                      value={product.quantity_fractional}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_fractional', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{getUnitLabel(product.unit_of_measure)}</span>
                  </>
                ) : (
                  // Unit-based product
                  <>
                    <Input
                      type="number"
                      min="0"
                      className="w-16 h-8 text-center text-sm"
                      value={product.quantity_units || product.quantity_fractional || 0}
                      onChange={(e) => updateProductUsage(product.product_id, 'quantity_units', parseInt(e.target.value) || 0)}
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">unidades</span>
                  </>
                )}

                <span className="text-sm font-medium min-w-[70px] text-right">
                  {formatCurrency(product.total_cost)}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                  disabled={disabled}
                  onClick={saveProducts}
                  title="Salvar produtos"
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeProduct(product.product_id)}
                  disabled={disabled}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          {/* Save button + feedback */}
          {productUsages.length > 0 && !disabled && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className={cn(
                  "gap-2",
                  isSaved && "bg-green-600 hover:bg-green-700",
                  isDirty && "animate-pulse"
                )}
                onClick={saveProducts}
              >
                <Save className="h-4 w-4" />
                {isSaved ? "Salvo!" : isDirty ? "Salvar Produtos" : "Salvar Produtos"}
              </Button>
              {isDirty && (
                <span className="text-xs text-amber-600 font-medium">Alterações não salvas</span>
              )}
              {isSaved && (
                <span className="text-xs text-green-600 font-medium">Custo atualizado na comanda</span>
              )}
            </div>
          )}

          {/* Add new product row */}
          {isAddingProduct ? (
            <div className="p-2 rounded-md bg-primary/10 border border-primary/40 space-y-2">
              {/* Search + quantity row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    className="h-8 pl-8 bg-background text-sm"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    autoFocus={false}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step={selectedProductIsFractional ? "0.1" : "1"}
                    placeholder="Qtd"
                    className="w-16 h-8 text-center bg-background"
                    value={newProductQty || ""}
                    onChange={(e) => setNewProductQty(parseFloat(e.target.value) || 0)}
                  />
                  {selectedNewProduct && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[30px]">
                      {getUnitLabel(selectedNewProduct.unit_of_measure || "unidade")}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={handleAddProduct}
                  disabled={!newProductId}
                  title="Adicionar"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setIsAddingProduct(false);
                    setNewProductId("");
                    setNewProductQty(1);
                    setProductSearch("");
                  }}
                  title="Cancelar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Product list */}
              {(() => {
                const filtered = availableProducts.filter(p =>
                  p.name.toLowerCase().includes(productSearch.toLowerCase())
                );
                return (
                  <div className="max-h-32 overflow-y-auto rounded border bg-background">
                    {filtered.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum produto encontrado
                      </div>
                    ) : (
                      filtered.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                            newProductId === product.id && "bg-primary/10 font-medium"
                          )}
                          onClick={() => setNewProductId(product.id)}
                        >
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getUnitLabel(product.unit_of_measure || "unidade")}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 mt-2"
              onClick={() => setIsAddingProduct(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
