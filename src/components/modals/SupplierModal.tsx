import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search } from "lucide-react";
import { Supplier, SupplierInput } from "@/hooks/useSuppliers";
import { useCepLookup } from "@/hooks/useCepLookup";

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SupplierInput) => void;
  supplier: Supplier | null;
  isLoading: boolean;
}

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function SupplierModal({
  open,
  onClose,
  onSave,
  supplier,
  isLoading,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<SupplierInput>({
    name: "",
    trade_name: "",
    document: "",
    responsible: "",
    website: "",
    phone: "",
    mobile: "",
    email: "",
    cep: "",
    state: "",
    city: "",
    address: "",
    address_number: "",
    neighborhood: "",
    address_complement: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        trade_name: supplier.trade_name || "",
        document: supplier.document || "",
        responsible: supplier.responsible || "",
        website: supplier.website || "",
        phone: supplier.phone || "",
        mobile: supplier.mobile || "",
        email: supplier.email || "",
        cep: supplier.cep || "",
        state: supplier.state || "",
        city: supplier.city || "",
        address: supplier.address || "",
        address_number: supplier.address_number || "",
        neighborhood: supplier.neighborhood || "",
        address_complement: supplier.address_complement || "",
        notes: supplier.notes || "",
        is_active: supplier.is_active,
      });
    } else {
      setFormData({
        name: "",
        trade_name: "",
        document: "",
        responsible: "",
        website: "",
        phone: "",
        mobile: "",
        email: "",
        cep: "",
        state: "",
        city: "",
        address: "",
        address_number: "",
        neighborhood: "",
        address_complement: "",
        notes: "",
        is_active: true,
      });
    }
  }, [supplier, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  const handleChange = (field: keyof SupplierInput, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const { lookupCep, isLoading: isLoadingCep } = useCepLookup();

  const handleCepLookup = async () => {
    const addressData = await lookupCep(formData.cep || "");
    if (addressData) {
      setFormData((prev) => ({
        ...prev,
        address: addressData.address,
        neighborhood: addressData.neighborhood,
        city: addressData.city,
        state: addressData.state,
        address_complement: addressData.address_complement || prev.address_complement,
      }));
    }
  };

  const handleCepChange = (value: string) => {
    // Format CEP as user types (00000-000)
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    handleChange("cep", formatted);
    
    // Auto-lookup when CEP is complete
    if (cleaned.length === 8) {
      lookupCep(cleaned).then((addressData) => {
        if (addressData) {
          setFormData((prev) => ({
            ...prev,
            address: addressData.address,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            address_complement: addressData.address_complement || prev.address_complement,
          }));
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document">CNPJ/CPF</Label>
                  <Input
                    id="document"
                    value={formData.document}
                    onChange={(e) => handleChange("document", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Razão Social</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name}
                    onChange={(e) => handleChange("trade_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Fantasia *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsável</Label>
                  <Input
                    id="responsible"
                    value={formData.responsible}
                    onChange={(e) => handleChange("responsible", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Site</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Celular</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="is_active">Fornecedor ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange("is_active", checked)}
                />
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCepLookup}
                      disabled={isLoadingCep || !formData.cep}
                      title="Buscar endereço"
                    >
                      {isLoadingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione</option>
                    {BRAZILIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => handleChange("address_number", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => handleChange("neighborhood", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => handleChange("address_complement", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
