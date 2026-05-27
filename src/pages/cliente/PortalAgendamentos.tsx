// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, X } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function PortalAgendamentos() {
  const { isAuthenticated, loading, myAppointments, cancelMyAppointment } = useClientPortal();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appts, setAppts] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/cliente/login", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  async function reload() {
    setBusy(true);
    try {
      const a = await myAppointments();
      setAppts(a);
    } catch (err: any) {
      toast({ title: "Erro ao carregar", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) reload();
  }, [isAuthenticated]);

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este horário?")) return;
    setCancelingId(id);
    try {
      await cancelMyAppointment(id);
      toast({ title: "Cancelado" });
      reload();
    } catch (err: any) {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <ClientLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Meus horários</h1>
          <Button size="sm" onClick={() => navigate("/cliente/agendar")}>
            <Calendar className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </div>

        {busy ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : appts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 space-y-3">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Você ainda não tem horários marcados.</p>
              <Button onClick={() => navigate("/cliente/agendar")}>Marcar agora</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appts.map((a) => {
              const dt = new Date(a.scheduled_at);
              const isFuture = dt > new Date();
              const canCancel = isFuture && a.status !== "cancelled" && a.status !== "completed";
              return (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{a.services?.name ?? "Serviço"}</div>
                        <div className="text-xs text-muted-foreground">
                          com {a.professionals?.nickname || a.professionals?.name}
                        </div>
                      </div>
                      <Badge variant="outline" className={STATUS_COLOR[a.status]}>
                        {STATUS_LABEL[a.status] || a.status}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      {dt.toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      às{" "}
                      {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {a.price && (
                      <div className="text-xs text-muted-foreground">
                        R$ {Number(a.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        disabled={cancelingId === a.id}
                        onClick={() => handleCancel(a.id)}
                      >
                        {cancelingId === a.id ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <X className="mr-2 h-3 w-3" />
                        )}
                        Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
