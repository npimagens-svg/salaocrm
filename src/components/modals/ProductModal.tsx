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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, ProductInput } from "@/hooks/useProducts";
import { Supplier } from "@/hooks/useSuppliers";


interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductInput & { id?: string; supplier_id?: string | null }) => void;
  isLoading?: boolean;
  suppliers?: Supplier[];
}

const UNIT_OPTIONS = [
  { value: "unidade", label: "Por Unidade" },
  { value: "ml", label: "Por ml (mililitro)" },
  { value: "g", label: "Por g (grama)" },
  { value: "dosagem", label: "Por dosagem" },
  { value: "cm", label: "Por centímetro" },
  { value: "caixa", label: "Por caixa" },
  { value: "pacote", label: "Por pacote" },
];

export function ProductModal({ open, onOpenChange, product, onSubmit, isLoading, suppliers = [] }: ProductModalProps) {
  const isEditing = !!product;
  
  const [formData, setFormData] = useState<ProductInput & { supplier_id?: string | null }>({
    name: "",
    description: "",
    sku: "",
    category: "",
    brand: "",
    product_line: "",
    cost_price: 0,
    sale_price: 0,
    commission_percent: 0,
    current_stock: 0,
    current_stock_fractional: 0,
    min_stock: 0,
    is_active: true,
    supplier_id: null,
    unit_of_measure: "unidade",
    unit_quantity: 1,
    is_for_resale: true,
    is_for_consumption: true,
  });

  const isFractional = ["ml", "g", "dosagem", "cm"].includes(formData.unit_of_measure || "");
  const unitLabel = formData.unit_of_measure === "ml" ? "ml" : formData.unit_of_measure === "g" ? "g" : formData.unit_of_measure === "dosagem" ? "dose" : formData.unit_of_measure === "cm" ? "cm" : "un";

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku || "",
        category: product.category || "",
        brand: product.brand || "",
        product_line: product.product_line || "",
        cost_price: Number(product.cost_price),
        sale_price: Number(product.sale_price),
        commission_percent: Number(product.commission_percent) || 0,
        current_stock: product.current_stock,
        current_stock_fractional: Number(product.current_stock_fractional) || 0,
        min_stock: product.min_stock,
        is_active: product.is_active,
        supplier_id: product.supplier_id || null,
        unit_of_measure: product.unit_of_measure || "unidade",
        unit_quantity: Number(product.unit_quantity) || 1,
        is_for_resale: product.is_for_resale ?? true,
        is_for_consumption: product.is_for_consumption ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        brand: "",
        product_line: "",
        cost_price: 0,
        sale_price: 0,
        commission_percent: 0,
        current_stock: 0,
        current_stock_fractional: 0,
        min_stock: 0,
        is_active: true,
        supplier_id: null,
        unit_of_measure: "unidade",
        unit_quantity: 1,
        is_for_resale: true,
        is_for_consumption: true,
      });
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onSubmit({ ...formData, id: product.id });
    } else {
      onSubmit(formData);
    }
    onOpenChange(false);
  };

  // Calculate cost per unit
  const costPerUnit = formData.cost_price && formData.unit_quantity 
    ? formData.cost_price / formData.unit_quantity 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6" style={{ maxHeight: "calc(90vh - 160px)" }}>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-5 pb-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Código (SKU/EAN)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Código de barras"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_line">Linha</Label>
                  <Input
                    id="product_line"
                    value={formData.product_line}
                    onChange={(e) => setFormData({ ...formData, product_line: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Product Characteristics */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Característica do Produto</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_resale"
                    checked={formData.is_for_resale}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_for_resale: !!checked })}
                  />
                  <Label htmlFor="is_for_resale" className="font-normal cursor-pointer">
                    Venda
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_consumption"
                    checked={formData.is_for_consumption}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_for_consumption: !!checked })}
                  />
                  <Label htmlFor="is_for_consumption" className="font-normal cursor-pointer">
                    Consumo (uso em serviços)
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Valores</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Custo (R$)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Venda (R$)</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_percent">Comissão (%)</Label>
                  <Input
                    id="commission_percent"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.commission_percent}
                    onChange={(e) => setFormData({ ...formData, commission_percent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Unit of Measure - Compact Select */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Registro de Saída</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Tipo de saída</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      unit_of_measure: value,
                      unit_quantity: value === "unidade" ? 1 : (formData.unit_quantity === 1 ? 1000 : formData.unit_quantity)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content per unit - Only shows when ml or g is selected */}
                {isFractional && (
                  <div className="space-y-2">
                    <Label htmlFor="unit_quantity">Conteúdo do produto ({unitLabel})</Label>
                    <Input
                      id="unit_quantity"
                      type="number"
                      min={1}
                      step={1}
                      value={formData.unit_quantity}
                      onChange={(e) => setFormData({ ...formData, unit_quantity: parseFloat(e.target.value) || 1 })}
                      placeholder={formData.unit_of_measure === "ml" ? "Ex: 1000" : "Ex: 500"}
                    />
                  </div>
                )}
              </div>

              {/* Cost per unit calculation - Only shows when fractional and has values */}
              {isFractional && costPerUnit > 0 && (
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Custo por {unitLabel}:</span>
                    <span className="font-bold text-primary">R$ {costPerUnit.toFixed(4)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {formData.cost_price.toFixed(2)} ÷ {formData.unit_quantity} {unitLabel}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select
                value={formData.supplier_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers
                    .filter(s => s.is_active)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Stock */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Estoque</Label>
                {!isEditing && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                    Entrada Inicial
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">
                    {isEditing ? "Estoque Atual" : "Qtd Inicial"} (unidades)
                  </Label>
                  <Input
                    id="current_stock"
                    type="number"
                    min={0}
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min={0}
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Fractional stock - only for editing */}
              {isFractional && isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="current_stock_fractional">
                    Fracionado aberto ({unitLabel} restante)
                  </Label>
                  <Input
                    id="current_stock_fractional"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.current_stock_fractional}
                    onChange={(e) => setFormData({ ...formData, current_stock_fractional: parseFloat(e.target.value) || 0 })}
                    className="max-w-[200px]"
                  />
                </div>
              )}

              {/* Stock Summary */}
              {isFractional && formData.current_stock > 0 && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-medium">
                    {((formData.current_stock * formData.unit_quantity) + (isEditing ? (formData.current_stock_fractional || 0) : 0)).toLocaleString("pt-BR")} {unitLabel}
                  </span>
                  <span className="text-muted-foreground"> ({formData.current_stock} frascos)</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Produto Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
