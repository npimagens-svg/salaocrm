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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Package, PackageInput } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";

interface PackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg?: Package | null;
  onSubmit: (data: PackageInput & { id?: string }) => void;
  isLoading?: boolean;
}

interface ItemRow {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
}

export function PackageModal({ open, onOpenChange, pkg, onSubmit, isLoading }: PackageModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);

  const { services } = useServices();
  const activeServices = services.filter((s) => s.is_active);

  useEffect(() => {
    if (pkg) {
      setName(pkg.name);
      setDescription(pkg.description || "");
      setPrice(Number(pkg.price));
      setIsActive(pkg.is_active);
      setItems(
        (pkg.package_items || []).map((pi) => ({
          service_id: pi.service_id,
          service_name: pi.service?.name || "Servico",
          quantity: pi.quantity,
          unit_price: Number(pi.unit_price),
        }))
      );
    } else {
      setName("");
      setDescription("");
      setPrice(0);
      setIsActive(true);
      setItems([]);
    }
    setSelectedServiceId("");
    setSelectedQty(1);
  }, [pkg, open]);

  const originalPrice = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discountPercent = originalPrice > 0 ? ((originalPrice - price) / originalPrice) * 100 : 0;

  const handleAddItem = () => {
    if (!selectedServiceId) return;
    const service = activeServices.find((s) => s.id === selectedServiceId);
    if (!service) return;

    // Check if already added
    const existing = items.find((i) => i.service_id === selectedServiceId);
    if (existing) {
      setItems(
        items.map((i) =>
          i.service_id === selectedServiceId
            ? { ...i, quantity: i.quantity + selectedQty }
            : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          service_id: service.id,
          service_name: service.name,
          quantity: selectedQty,
          unit_price: Number(service.price),
        },
      ]);
    }
    setSelectedServiceId("");
    setSelectedQty(1);
  };

  const handleRemoveItem = (serviceId: string) => {
    setItems(items.filter((i) => i.service_id !== serviceId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: PackageInput & { id?: string } = {
      name,
      description: description || undefined,
      price,
      original_price: originalPrice,
      discount_percent: Math.max(0, Math.round(discountPercent * 100) / 100),
      is_active: isActive,
      items: items.map((i) => ({
        service_id: i.service_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };
    if (pkg) data.id = pkg.id;
    onSubmit(data);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">Nome *</Label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pacote Noiva Completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-desc">Descricao</Label>
            <Textarea
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descricao do pacote..."
            />
          </div>

          {/* Add service section */}
          <div className="space-y-2">
            <Label>Servicos do Pacote</Label>
            <div className="flex gap-2">
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um servico" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(Number(service.price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={selectedQty}
                onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                className="w-20"
                placeholder="Qtd"
              />
              <Button type="button" onClick={handleAddItem} disabled={!selectedServiceId} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servico</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Preco Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.service_id}>
                    <TableCell className="font-medium">{item.service_name}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          setItems(items.map((i) => i.service_id === item.service_id ? { ...i, quantity: qty } : i));
                        }}
                        className="w-16 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.service_id)}
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

          {/* Pricing */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Preco original (soma dos servicos):</span>
              <span className="font-medium">{formatCurrency(originalPrice)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-price">Preco do Pacote (R$) *</Label>
              <Input
                id="pkg-price"
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            {originalPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span>Desconto:</span>
                <span className={`font-medium ${discountPercent > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {discountPercent > 0 ? `${discountPercent.toFixed(1)}%` : "Sem desconto"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pkg-active">Pacote Ativo</Label>
            <Switch id="pkg-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || items.length === 0}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
