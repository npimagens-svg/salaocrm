import { useState, useEffect, useMemo } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Package as PackageIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product, ProductInput, useProducts } from "@/hooks/useProducts";
import { Supplier } from "@/hooks/useSuppliers";
import { ProductKit, ProductKitInput } from "@/hooks/useProductKits";
import { calculateKit } from "@/lib/kits/calculations";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  kit?: ProductKit | null;
  onSubmit: (data: ProductInput & { id?: string; supplier_id?: string | null }) => void;
  onSubmitKit?: (data: ProductKitInput & { id?: string }) => void;
  isLoading?: boolean;
  isLoadingKit?: boolean;
  suppliers?: Supplier[];
  /** Aba inicial quando abrir em modo criar. Default 'produto'. */
  initialTab?: "produto" | "kit";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

interface KitItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  sale_price: number;
  cost_price: number;
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  kit,
  onSubmit,
  onSubmitKit,
  isLoading,
  isLoadingKit,
  suppliers = [],
  initialTab = "produto",
}: ProductModalProps) {
  const isEditingProduct = !!product;
  const isEditingKit = !!kit;
  const isEditing = isEditingProduct || isEditingKit;

  // Tab: forçada pra aba do item em edição; livre em modo criar
  const [tab, setTab] = useState<"produto" | "kit">(
    isEditingKit ? "kit" : isEditingProduct ? "produto" : initialTab
  );

  // ───────────────────────── PRODUTO ─────────────────────────
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
  const unitLabel =
    formData.unit_of_measure === "ml"
      ? "ml"
      : formData.unit_of_measure === "g"
      ? "g"
      : formData.unit_of_measure === "dosagem"
      ? "dose"
      : formData.unit_of_measure === "cm"
      ? "cm"
      : "un";

  // ───────────────────────── KIT ─────────────────────────
  const { products: allProducts } = useProducts();
  const activeProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.is_active),
    [allProducts]
  );

  const [kitName, setKitName] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [kitDiscountPercent, setKitDiscountPercent] = useState(0);
  const [kitIsActive, setKitIsActive] = useState(true);
  const [kitItems, setKitItems] = useState<KitItemRow[]>([]);
  const [kitSelectedProductId, setKitSelectedProductId] = useState("");
  const [kitSelectedQty, setKitSelectedQty] = useState(1);
  const [kitProductPopoverOpen, setKitProductPopoverOpen] = useState(false);
  const [kitProductSearch, setKitProductSearch] = useState("");

  const kitSelectedProductName = useMemo(() => {
    if (!kitSelectedProductId) return "";
    return activeProducts.find((p) => p.id === kitSelectedProductId)?.name || "";
  }, [kitSelectedProductId, activeProducts]);

  const kitFilteredProducts = useMemo(() => {
    const q = kitProductSearch.toLowerCase().trim();
    if (!q) return activeProducts;
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
    );
  }, [activeProducts, kitProductSearch]);

  const kitCalc = useMemo(
    () =>
      calculateKit(
        kitItems.map((i) => ({
          quantity: i.quantity,
          product: { sale_price: i.sale_price, cost_price: i.cost_price },
        })),
        kitDiscountPercent
      ),
    [kitItems, kitDiscountPercent]
  );

  // ───────────────────────── EFFECTS ─────────────────────────
  useEffect(() => {
    if (!open) return;

    // Define aba: edit força aba do item, criar usa initialTab
    if (isEditingKit) setTab("kit");
    else if (isEditingProduct) setTab("produto");
    else setTab(initialTab);

    // Carrega dados do produto pra editar (ou reset)
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

    // Carrega dados do kit pra editar (ou reset)
    if (kit) {
      setKitName(kit.name);
      setKitDescription(kit.description || "");
      setKitDiscountPercent(Number(kit.discount_percent));
      setKitIsActive(kit.is_active);
      setKitItems(
        (kit.product_kit_items || []).map((ki) => ({
          product_id: ki.product_id,
          product_name: ki.product?.name || "Produto",
          quantity: Number(ki.quantity),
          sale_price: Number(ki.product?.sale_price ?? 0),
          cost_price: Number(ki.product?.cost_price ?? 0),
        }))
      );
    } else {
      setKitName("");
      setKitDescription("");
      setKitDiscountPercent(0);
      setKitIsActive(true);
      setKitItems([]);
    }
    setKitSelectedProductId("");
    setKitSelectedQty(1);
  }, [product, kit, open, initialTab, isEditingKit, isEditingProduct]);

  // ───────────────────────── HANDLERS ─────────────────────────
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onSubmit({ ...formData, id: product.id });
    } else {
      onSubmit(formData);
    }
    onOpenChange(false);
  };

  const handleSubmitKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitKit) return;
    if (kitItems.length === 0) return;

    const payload: ProductKitInput & { id?: string } = {
      name: kitName,
      description: kitDescription || undefined,
      discount_percent: kitDiscountPercent,
      is_active: kitIsActive,
      items: kitItems.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
    };
    if (kit) payload.id = kit.id;
    onSubmitKit(payload);
    onOpenChange(false);
  };

  const handleAddKitItem = () => {
    if (!kitSelectedProductId) return;
    const p = activeProducts.find((x) => x.id === kitSelectedProductId);
    if (!p) return;

    const existing = kitItems.find((i) => i.product_id === kitSelectedProductId);
    if (existing) {
      setKitItems(
        kitItems.map((i) =>
          i.product_id === kitSelectedProductId
            ? { ...i, quantity: i.quantity + kitSelectedQty }
            : i
        )
      );
    } else {
      setKitItems([
        ...kitItems,
        {
          product_id: p.id,
          product_name: p.name,
          quantity: kitSelectedQty,
          sale_price: Number(p.sale_price),
          cost_price: Number(p.cost_price),
        },
      ]);
    }
    setKitSelectedProductId("");
    setKitSelectedQty(1);
  };

  const handleRemoveKitItem = (productId: string) => {
    setKitItems(kitItems.filter((i) => i.product_id !== productId));
  };

  const costPerUnit =
    formData.cost_price && formData.unit_quantity
      ? formData.cost_price / formData.unit_quantity
      : 0;

  // ───────────────────────── TÍTULO + FOOTER ─────────────────────────
  const title = isEditingKit
    ? "Editar Kit"
    : isEditingProduct
    ? "Editar Produto"
    : tab === "kit"
    ? "Novo Kit"
    : "Novo Produto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => !isEditing && setTab(v as "produto" | "kit")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Tabs visíveis só no modo criar — no edit a aba está fixada */}
          {!isEditing && (
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="produto">Produto</TabsTrigger>
                <TabsTrigger value="kit">Kit de Produtos</TabsTrigger>
              </TabsList>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto px-6 pt-4"
            style={{ maxHeight: "calc(90vh - 200px)" }}
          >
            {/* ─────────────────── ABA PRODUTO ─────────────────── */}
            <TabsContent value="produto" className="mt-0">
              <form id="product-form" onSubmit={handleSubmitProduct} className="space-y-5 pb-4">
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

                {/* Characteristics */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Característica do Produto</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_for_resale"
                        checked={formData.is_for_resale}
                        onCheckedChange={(c) => setFormData({ ...formData, is_for_resale: !!c })}
                      />
                      <Label htmlFor="is_for_resale" className="font-normal cursor-pointer">
                        Venda
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_for_consumption"
                        checked={formData.is_for_consumption}
                        onCheckedChange={(c) => setFormData({ ...formData, is_for_consumption: !!c })}
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
                        onChange={(e) =>
                          setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                        }
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
                        onChange={(e) =>
                          setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
                        }
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commission_percent: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Unit */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Registro de Saída</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_of_measure">Tipo de saída</Label>
                      <Select
                        value={formData.unit_of_measure}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            unit_of_measure: value,
                            unit_quantity:
                              value === "unidade"
                                ? 1
                                : formData.unit_quantity === 1
                                ? 1000
                                : formData.unit_quantity,
                          })
                        }
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
                    {isFractional && (
                      <div className="space-y-2">
                        <Label htmlFor="unit_quantity">Conteúdo do produto ({unitLabel})</Label>
                        <Input
                          id="unit_quantity"
                          type="number"
                          min={1}
                          step={1}
                          value={formData.unit_quantity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              unit_quantity: parseFloat(e.target.value) || 1,
                            })
                          }
                          placeholder={formData.unit_of_measure === "ml" ? "Ex: 1000" : "Ex: 500"}
                        />
                      </div>
                    )}
                  </div>
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
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        supplier_id: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers
                        .filter((s) => s.is_active)
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
                    {!isEditingProduct && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                        Entrada Inicial
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_stock">
                        {isEditingProduct ? "Estoque Atual" : "Qtd Inicial"} (unidades)
                      </Label>
                      <Input
                        id="current_stock"
                        type="number"
                        min={0}
                        value={formData.current_stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_stock: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock">Estoque Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min={0}
                        value={formData.min_stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_stock: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  {isFractional && isEditingProduct && (
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_stock_fractional: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                  {isFractional && formData.current_stock > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-medium">
                        {(
                          formData.current_stock * formData.unit_quantity +
                          (isEditingProduct ? formData.current_stock_fractional || 0 : 0)
                        ).toLocaleString("pt-BR")}{" "}
                        {unitLabel}
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
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
              </form>
            </TabsContent>

            {/* ─────────────────── ABA KIT ─────────────────── */}
            <TabsContent value="kit" className="mt-0">
              <form id="kit-form" onSubmit={handleSubmitKit} className="space-y-5 pb-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kit-name">Nome do Kit *</Label>
                    <Input
                      id="kit-name"
                      value={kitName}
                      onChange={(e) => setKitName(e.target.value)}
                      placeholder="Ex: Kit Long & Strong (Sh + Cond + Másc)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kit-desc">Descrição</Label>
                    <Textarea
                      id="kit-desc"
                      value={kitDescription}
                      onChange={(e) => setKitDescription(e.target.value)}
                      rows={2}
                      placeholder="Ex: Tratamento completo Keune pra cabelos secos"
                    />
                  </div>
                </div>

                <Separator />

                {/* Adicionar produtos */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Produtos no Kit</Label>
                  <p className="text-xs text-muted-foreground">
                    Selecione os produtos que compõem este kit. Ao vender, o estoque dos
                    produtos abaixo será baixado automaticamente.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Popover open={kitProductPopoverOpen} onOpenChange={setKitProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between font-normal"
                        >
                          <span className={cn("truncate", !kitSelectedProductId && "text-muted-foreground")}>
                            {kitSelectedProductName || "Digite o nome do produto..."}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="!w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4}>
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar produto pelo nome, SKU ou marca..."
                            value={kitProductSearch}
                            onValueChange={setKitProductSearch}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="max-h-64">
                                {kitFilteredProducts.slice(0, 100).map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.id}
                                    onSelect={() => {
                                      setKitSelectedProductId(p.id);
                                      setKitProductPopoverOpen(false);
                                      setKitProductSearch("");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        kitSelectedProductId === p.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{p.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {p.brand && <span>{p.brand} • </span>}
                                        Estoque: {p.current_stock}
                                      </div>
                                    </div>
                                    <span className="ml-2 font-medium text-primary whitespace-nowrap">
                                      {formatCurrency(Number(p.sale_price))}
                                    </span>
                                  </CommandItem>
                                ))}
                                {kitFilteredProducts.length > 100 && (
                                  <div className="text-xs text-muted-foreground text-center py-2 border-t">
                                    Mostrando 100 de {kitFilteredProducts.length}. Refine a busca.
                                  </div>
                                )}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={kitSelectedQty}
                      onChange={(e) => setKitSelectedQty(parseFloat(e.target.value) || 1)}
                      className="w-20"
                      placeholder="Qtd"
                    />
                    <Button
                      type="button"
                      onClick={handleAddKitItem}
                      disabled={!kitSelectedProductId}
                      size="icon"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {kitItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitItems.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0.001}
                              step={0.001}
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseFloat(e.target.value) || 1;
                                setKitItems(
                                  kitItems.map((i) =>
                                    i.product_id === item.product_id
                                      ? { ...i, quantity: qty }
                                      : i
                                  )
                                );
                              }}
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.sale_price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.sale_price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveKitItem(item.product_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <Separator />

                {/* Desconto */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="kit-discount" className="text-base font-medium">
                      Desconto do Kit
                    </Label>
                    <span className="text-2xl font-bold text-primary">
                      {kitDiscountPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    id="kit-discount"
                    min={0}
                    max={100}
                    step={1}
                    value={[kitDiscountPercent]}
                    onValueChange={(v) => setKitDiscountPercent(v[0])}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={kitDiscountPercent}
                      onChange={(e) => {
                        const v = Math.min(
                          Math.max(parseFloat(e.target.value) || 0, 0),
                          100
                        );
                        setKitDiscountPercent(v);
                      }}
                      placeholder="Desconto %"
                    />
                    <div className="text-sm text-muted-foreground self-center">
                      Cliente economiza {formatCurrency(kitCalc.savings)}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo total:</span>
                    <span className="font-medium">{formatCurrency(kitCalc.costTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal (sem desconto):</span>
                    <span className="font-medium">{formatCurrency(kitCalc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t">
                    <span className="font-medium">Preço de venda:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(kitCalc.finalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem:</span>
                    <span
                      className={`font-medium ${
                        kitCalc.marginPercent >= 50
                          ? "text-green-600"
                          : kitCalc.marginPercent >= 30
                          ? "text-yellow-600"
                          : "text-destructive"
                      }`}
                    >
                      {kitCalc.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="kit-active">Kit Ativo (aparece na comanda)</Label>
                  <Switch
                    id="kit-active"
                    checked={kitIsActive}
                    onCheckedChange={setKitIsActive}
                  />
                </div>
              </form>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {tab === "produto" ? (
            <Button type="submit" form="product-form" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Produto"}
            </Button>
          ) : (
            <Button
              type="submit"
              form="kit-form"
              disabled={isLoadingKit || kitItems.length === 0 || !kitName.trim()}
            >
              {isLoadingKit ? "Salvando..." : "Salvar Kit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
