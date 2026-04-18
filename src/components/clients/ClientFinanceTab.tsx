import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useClientBalance } from "@/hooks/useClientBalance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientFinanceTabProps {
  clientId: string;
  clientName: string;
}

export function ClientFinanceTab({ clientId, clientName }: ClientFinanceTabProps) {
  const { entries, summary, isLoading, addCredit, addDebt, isAddingCredit, isAddingDebt } = useClientBalance(clientId);

  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleAddCredit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    addCredit(
      { amount: numAmount, description: description || undefined },
      {
        onSuccess: () => {
          setCreditModalOpen(false);
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  const handleAddDebt = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    addDebt(
      { amount: numAmount, description: description || undefined },
      {
        onSuccess: () => {
          setDebtModalOpen(false);
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Financeiro de {clientName}</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => {
              setAmount("");
              setDescription("");
              setCreditModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Credito
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
            onClick={() => {
              setAmount("");
              setDescription("");
              setDebtModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Registrar Divida
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <TrendingUp className="h-4 w-4" />
              <Label className="text-xs font-medium text-green-700">Creditos</Label>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalCredits)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <TrendingDown className="h-4 w-4" />
              <Label className="text-xs font-medium text-red-700">Dividas</Label>
            </div>
            <p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalDebts)}</p>
          </CardContent>
        </Card>
        <Card className={`${summary.netBalance >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${summary.netBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
              <Wallet className="h-4 w-4" />
              <Label className={`text-xs font-medium ${summary.netBalance >= 0 ? "text-green-700" : "text-red-700"}`}>Saldo</Label>
            </div>
            <p className={`text-xl font-bold ${summary.netBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(summary.netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      {entries.length === 0 ? (
        <Card className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro financeiro encontrado</p>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {entry.type === "credit" ? (
                    <Badge className="bg-green-600">Credito</Badge>
                  ) : (
                    <Badge variant="destructive">Divida</Badge>
                  )}
                </TableCell>
                <TableCell>{entry.description || "—"}</TableCell>
                <TableCell className={`text-right font-medium ${entry.type === "credit" ? "text-green-700" : "text-red-700"}`}>
                  {entry.type === "credit" ? "+" : "-"} {formatCurrency(Number(entry.amount))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Credit Modal */}
      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Credito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pagamento adiantado, bonificacao..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddCredit}
              disabled={!amount || parseFloat(amount) <= 0 || isAddingCredit}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAddingCredit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar Credito"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Debt Modal */}
      <Dialog open={debtModalOpen} onOpenChange={setDebtModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Divida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Servico nao pago, produto fiado..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebtModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDebt}
              disabled={!amount || parseFloat(amount) <= 0 || isAddingDebt}
              variant="destructive"
            >
              {isAddingDebt ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar Divida"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
