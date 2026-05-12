import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Package, AlertTriangle, Edit, Trash2, Truck, Globe, Phone, ArrowDownToLine, ArrowUpFromLine, Upload } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useProductKits, ProductKit } from "@/hooks/useProductKits";
import { useSuppliers, Supplier, SupplierInput } from "@/hooks/useSuppliers";
import { calculateKit } from "@/lib/kits/calculations";
import { ProductModal } from "@/components/modals/ProductModal";
import { SupplierModal } from "@/components/modals/SupplierModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { StockEntryModal } from "@/components/modals/StockEntryModal";
import { StockExitModal } from "@/components/modals/StockExitModal";
import { ImportModal, ImportField } from "@/components/modals/ImportModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Estoque() {
  const location = useLocation();
  const currentTab = location.pathname === "/estoque/fornecedores" ? "fornecedores" : "produtos";

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierModalOpen, setDeleteSupplierModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [stockEntryModalOpen, setStockEntryModalOpen] = useState(false);
  const [stockExitModalOpen, setStockExitModalOpen] = useState(false);
  const [importProductsOpen, setImportProductsOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<ProductKit | null>(null);
  const [deleteKitModalOpen, setDeleteKitModalOpen] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<ProductKit | null>(null);
  /** Aba inicial quando clicar 'Cadastrar' direto na tabela de Kits */
  const [productModalInitialTab, setProductModalInitialTab] = useState<"produto" | "kit">("produto");

  const { isMaster, salonId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const productImportFields: ImportField[] = [
    { key: "name", label: "Nome", required: true },
    { key: "description", label: "Descrição" },
    { key: "sku", label: "SKU / Código" },
    { key: "category", label: "Categoria" },
    { key: "brand", label: "Marca" },
    { key: "product_line", label: "Linha" },
    { key: "cost_price", label: "Preço de custo" },
    { key: "sale_price", label: "Preço de venda" },
    { key: "current_stock", label: "Estoque atual" },
    { key: "min_stock", label: "Estoque mínimo" },
    { key: "unit_of_measure", label: "Unidade de medida" },
    { key: "commission_percent", label: "Comissão (%)" },
  ];

  const handleImportProducts = async (records: Record<string, any>[]) => {
    if (!salonId) throw new Error("Salão não encontrado");
    const rows = records.map(r => ({
      salon_id: salonId,
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      sku: r.sku ? String(r.sku) : null,
      category: r.category ? String(r.category) : null,
      brand: r.brand ? String(r.brand) : null,
      product_line: r.product_line ? String(r.product_line) : null,
      cost_price: r.cost_price ? parseFloat(String(r.cost_price).replace(",", ".")) : 0,
      sale_price: r.sale_price ? parseFloat(String(r.sale_price).replace(",", ".")) : 0,
      current_stock: r.current_stock ? parseInt(String(r.current_stock)) : 0,
      min_stock: r.min_stock ? parseInt(String(r.min_stock)) : 0,
      unit_of_measure: r.unit_of_measure ? String(r.unit_of_measure) : "unidade",
      commission_percent: r.commission_percent ? parseFloat(String(r.commission_percent).replace(",", ".")) : 0,
      is_active: true,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from("products").insert(batch);
      if (error) throw error;
    }

    qc.invalidateQueries({ queryKey: ["products"] });
    toast({ title: `${rows.length} produtos importados com sucesso!` });
  };

  const { products, isLoading: isLoadingProducts, createProduct, updateProduct, deleteProduct, isCreating, isUpdating } = useProducts();
  const { kits, isLoading: isLoadingKits, createKit, updateKit, deleteKit, isCreating: isCreatingKit, isUpdating: isUpdatingKit, isDeleting: isDeletingKit } = useProductKits();
  const { 
    suppliers, 
    isLoading: isLoadingSuppliers, 
    createSupplier, 
    updateSupplier, 
    deleteSupplier,
    isCreating: isCreatingSupplier,
    isUpdating: isUpdatingSupplier,
    isDeleting: isDeletingSupplier,
  } = useSuppliers();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.trade_name?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.document?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = (product: any) => {
    if (confirm(`Deseja excluir o produto "${product.name}"?`)) {
      deleteProduct(product.id);
    }
  };

  const handleSubmitProduct = (data: any) => {
    if (selectedProduct) {
      updateProduct({ ...data, id: selectedProduct.id });
    } else {
      createProduct(data);
    }
    setProductModalOpen(false);
    setSelectedProduct(null);
  };

  // ─────────────────── Kits ───────────────────
  const handleEditKit = (k: ProductKit) => {
    setSelectedProduct(null);
    setSelectedKit(k);
    setProductModalInitialTab("kit");
    setProductModalOpen(true);
  };

  const handleSubmitKit = (data: any) => {
    if (data.id) {
      updateKit(data);
    } else {
      createKit(data);
    }
    setProductModalOpen(false);
    setSelectedKit(null);
  };

  const handleDeleteKitClick = (k: ProductKit) => {
    setKitToDelete(k);
    setDeleteKitModalOpen(true);
  };

  const confirmDeleteKit = () => {
    if (kitToDelete) {
      deleteKit(kitToDelete.id);
      setKitToDelete(null);
      setDeleteKitModalOpen(false);
    }
  };

  const handleNewKit = () => {
    setSelectedProduct(null);
    setSelectedKit(null);
    setProductModalInitialTab("kit");
    setProductModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplierClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteSupplierModalOpen(true);
  };

  const handleSaveSupplier = (data: SupplierInput) => {
    if (selectedSupplier) {
      updateSupplier({ ...data, id: selectedSupplier.id });
    } else {
      createSupplier(data);
    }
    setSupplierModalOpen(false);
    setSelectedSupplier(null);
  };

  const confirmDeleteSupplier = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setDeleteSupplierModalOpen(false);
      setSupplierToDelete(null);
    }
  };

  // Stats
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => (p.current_stock ?? 0) <= (p.min_stock ?? 0)).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.current_stock ?? 0) * (p.cost_price ?? 0)), 0);

  const isLoading = isLoadingProducts || isLoadingSuppliers;

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            {currentTab === "produtos" ? "Gerencie os produtos do seu estoque" : "Gerencie seus fornecedores"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Produtos</p>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                  <p className="text-2xl font-bold text-destructive">{lowStockProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <Package className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Truck className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content based on route */}
        {currentTab === "produtos" ? (
          /* Products Content */
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={() => setStockEntryModalOpen(true)} 
                      className="gap-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Entrada
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setStockExitModalOpen(true)} 
                      className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <ArrowUpFromLine className="h-4 w-4" />
                      Saída
                    </Button>
                    {isMaster && (
                      <Button variant="outline" className="gap-2" onClick={() => setImportProductsOpen(true)}>
                        <Upload className="h-4 w-4" />
                        Importar
                      </Button>
                    )}
                    <Button onClick={() => { setSelectedProduct(null); setProductModalOpen(true); }} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Cadastrar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const isLowStock = (product.current_stock ?? 0) <= (product.min_stock ?? 0);
                      const supplier = suppliers.find(s => s.id === (product as any).supplier_id);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground">{product.sku || "-"}</TableCell>
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell>
                            {supplier ? (
                              <Badge variant="outline">{supplier.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                          <TableCell className="text-center">
                            <span className={isLowStock ? "text-destructive font-medium" : ""}>
                              {product.current_stock ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isLowStock ? (
                              <Badge variant="destructive">Baixo</Badge>
                            ) : product.is_active ? (
                              <Badge variant="default">OK</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* ─────────── Seção: Kits de Produtos ─────────── */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Kits de Produtos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Combos de produtos com desconto único. Vendidos como linha única na comanda; estoque baixa nos produtos componentes.
                    </p>
                  </div>
                  <Button onClick={handleNewKit} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Kit
                  </Button>
                </div>

                {isLoadingKits ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : kits.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 border border-dashed rounded-md">
                    Nenhum kit cadastrado. Clique em "Novo Kit" pra criar.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kits.map((kit) => {
                      const items = kit.product_kit_items || [];
                      const calc = calculateKit(
                        items.map((i) => ({
                          quantity: Number(i.quantity),
                          product: {
                            sale_price: Number(i.product?.sale_price ?? 0),
                            cost_price: Number(i.product?.cost_price ?? 0),
                          },
                        })),
                        Number(kit.discount_percent)
                      );
                      return (
                        <Card
                          key={kit.id}
                          className={`hover:shadow-md transition-shadow ${
                            !kit.is_active ? "opacity-60" : ""
                          }`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{kit.name}</p>
                                {!kit.is_active && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditKit(kit)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteKitClick(kit)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {items.slice(0, 3).map((item) => (
                                <div key={item.id} className="truncate">
                                  • {Number(item.quantity)}× {item.product?.name || "Produto"}
                                </div>
                              ))}
                              {items.length > 3 && (
                                <div className="text-xs italic">
                                  + {items.length - 3} {items.length - 3 === 1 ? "produto" : "produtos"}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm">
                                {calc.savings > 0 && (
                                  <span className="line-through text-muted-foreground mr-1.5">
                                    {formatCurrency(calc.subtotal)}
                                  </span>
                                )}
                                <span className="font-bold text-primary">
                                  {formatCurrency(calc.finalPrice)}
                                </span>
                              </span>
                              {Number(kit.discount_percent) > 0 && (
                                <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                                  {Number(kit.discount_percent).toFixed(0)}% off
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Suppliers Content */
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fornecedor..."
                      value={supplierSearchTerm}
                      onChange={e => setSupplierSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => { setSelectedSupplier(null); setSupplierModalOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Fornecedor
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell className="text-muted-foreground">{supplier.document || "-"}</TableCell>
                        <TableCell>{supplier.responsible || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {supplier.phone && (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" /> {supplier.phone}
                              </span>
                            )}
                            {supplier.website && (
                              <a
                                href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Globe className="h-3 w-3" /> Site
                              </a>
                            )}
                            {!supplier.phone && !supplier.website && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.city && supplier.state
                            ? `${supplier.city}/${supplier.state}`
                            : supplier.city || supplier.state || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={supplier.is_active ? "default" : "secondary"}>
                            {supplier.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(supplier)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplierClick(supplier)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {supplierSearchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ProductModal
        open={productModalOpen}
        onOpenChange={(open) => {
          setProductModalOpen(open);
          if (!open) {
            setSelectedProduct(null);
            setSelectedKit(null);
            setProductModalInitialTab("produto");
          }
        }}
        product={selectedProduct}
        kit={selectedKit}
        onSubmit={handleSubmitProduct}
        onSubmitKit={handleSubmitKit}
        isLoading={isCreating || isUpdating}
        isLoadingKit={isCreatingKit || isUpdatingKit}
        suppliers={suppliers}
        initialTab={productModalInitialTab}
      />

      <SupplierModal
        open={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSave={handleSaveSupplier}
        supplier={selectedSupplier}
        isLoading={isCreatingSupplier || isUpdatingSupplier}
      />

      <DeleteConfirmModal
        open={deleteSupplierModalOpen}
        onOpenChange={setDeleteSupplierModalOpen}
        onConfirm={confirmDeleteSupplier}
        title="Excluir Fornecedor"
        description={`Tem certeza que deseja excluir o fornecedor "${supplierToDelete?.name}"? Esta ação não poderá ser desfeita.`}
        isLoading={isDeletingSupplier}
      />

      <DeleteConfirmModal
        open={deleteKitModalOpen}
        onOpenChange={setDeleteKitModalOpen}
        onConfirm={confirmDeleteKit}
        title="Excluir Kit"
        description={`Tem certeza que deseja excluir o kit "${kitToDelete?.name}"? Vendas históricas com esse kit serão preservadas.`}
        isLoading={isDeletingKit}
      />

      <StockEntryModal
        open={stockEntryModalOpen}
        onOpenChange={setStockEntryModalOpen}
        products={products}
        suppliers={suppliers}
      />

      <StockExitModal
        open={stockExitModalOpen}
        onOpenChange={setStockExitModalOpen}
        products={products}
      />

      <ImportModal
        open={importProductsOpen}
        onOpenChange={setImportProductsOpen}
        title="Importar Produtos"
        description="Importe produtos de uma planilha XLS, XLSX ou CSV exportada de outro sistema."
        fields={productImportFields}
        onImport={handleImportProducts}
      />
    </AppLayoutNew>
  );
}
