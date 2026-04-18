import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Appointment, AppointmentInput, MultiAppointmentInput } from "@/hooks/useAppointments";
import { Client } from "@/hooks/useClients";
import { Professional } from "@/hooks/useProfessionals";
import { Service } from "@/hooks/useServices";
import { DollarSign, Plus, X } from "lucide-react";
import { isSameDay, isFuture, startOfDay } from "date-fns";
import { ClientSearchSelect } from "@/components/shared/ClientSearchSelect";
import { ServiceSearchSelect } from "@/components/shared/ServiceSearchSelect";
import { supabase } from "@/lib/dynamicSupabaseClient";

interface ServiceBlock {
  id: string; // local key for React
  service_id: string;
  professional_id: string;
  time: string;
  duration_minutes: number;
  price: number;
}

function generateBlockId() {
  return crypto.randomUUID();
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  clients: Client[];
  professionals: Professional[];
  services: Service[];
  onSubmit: (data: AppointmentInput & { id?: string }) => void;
  onSubmitMultiple?: (data: MultiAppointmentInput) => void;
  isLoading?: boolean;
  defaultDate?: Date;
  defaultProfessionalId?: string;
  onOpenComanda?: (appointmentId: string) => void;
  onCreateClient?: (name: string) => void;
  onViewClient?: (clientId: string) => void;
}

export function AppointmentModal({
  open,
  onOpenChange,
  appointment,
  clients,
  professionals,
  services,
  onSubmit,
  onSubmitMultiple,
  isLoading,
  defaultDate,
  defaultProfessionalId,
  onOpenComanda,
  onCreateClient,
  onViewClient,
}: AppointmentModalProps) {
  const navigate = useNavigate();

  // Shared fields
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<string>("scheduled");
  const [notes, setNotes] = useState("");

  // Service blocks (multi-service support)
  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>([]);

  const isEditing = !!appointment;

  // Initialize form only when modal opens (not on every prop change)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;

    if (appointment) {
      const d = new Date(appointment.scheduled_at);
      setClientId(appointment.client_id || "");
      setDate(d.toISOString().split("T")[0]);
      setStatus(appointment.status);
      setNotes(appointment.notes || "");
      setServiceBlocks([
        {
          id: generateBlockId(),
          service_id: appointment.service_id || "",
          professional_id: appointment.professional_id,
          time: d.toTimeString().slice(0, 5),
          duration_minutes: appointment.duration_minutes,
          price: Number(appointment.price) || 0,
        },
      ]);
    } else {
      const d = defaultDate || new Date();
      setClientId("");
      setDate(d.toISOString().split("T")[0]);
      setStatus("scheduled");
      setNotes("");
      setServiceBlocks([
        {
          id: generateBlockId(),
          service_id: "",
          professional_id: defaultProfessionalId || "",
          time: d.toTimeString().slice(0, 5),
          duration_minutes: 30,
          price: 0,
        },
      ]);
    }
  }, [open, appointment, defaultDate, defaultProfessionalId]);

  const updateBlock = useCallback(
    (index: number, updates: Partial<ServiceBlock>) => {
      setServiceBlocks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...updates };

        // Auto-cascade times for subsequent blocks
        for (let i = index + 1; i < next.length; i++) {
          const prevBlock = next[i - 1];
          next[i] = {
            ...next[i],
            time: addMinutesToTime(prevBlock.time, prevBlock.duration_minutes),
          };
        }
        return next;
      });
    },
    []
  );

  const handleServiceChangeInBlock = useCallback(
    (index: number, serviceId: string) => {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        updateBlock(index, {
          service_id: serviceId,
          duration_minutes: service.duration_minutes,
          price: Number(service.price),
        });
      } else {
        updateBlock(index, { service_id: serviceId });
      }
    },
    [services, updateBlock]
  );

  const addServiceBlock = useCallback(() => {
    setServiceBlocks((prev) => {
      const last = prev[prev.length - 1];
      const nextTime = addMinutesToTime(last.time, last.duration_minutes);
      return [
        ...prev,
        {
          id: generateBlockId(),
          service_id: "",
          professional_id: last.professional_id,
          time: nextTime,
          duration_minutes: 30,
          price: 0,
        },
      ];
    });
  }, []);

  const removeServiceBlock = useCallback((index: number) => {
    setServiceBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      // Recalculate times from the removed index onward
      for (let i = Math.max(1, index); i < next.length; i++) {
        const prevBlock = next[i - 1];
        next[i] = {
          ...next[i],
          time: addMinutesToTime(prevBlock.time, prevBlock.duration_minutes),
        };
      }
      return next;
    });
  }, []);

  // Summary calculations
  const totalDuration = useMemo(
    () => serviceBlocks.reduce((sum, b) => sum + b.duration_minutes, 0),
    [serviceBlocks]
  );
  const totalPrice = useMemo(
    () => serviceBlocks.reduce((sum, b) => sum + b.price, 0),
    [serviceBlocks]
  );

  const allBlocksValid = useMemo(
    () => serviceBlocks.every((b) => b.service_id && b.professional_id),
    [serviceBlocks]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !allBlocksValid) return;

    if (isEditing) {
      // Update the original appointment with first block
      const block = serviceBlocks[0];
      const scheduled_at = new Date(`${date}T${block.time}`).toISOString();
      const groupId = appointment!.group_id || (serviceBlocks.length > 1 ? crypto.randomUUID() : undefined);

      onSubmit({
        id: appointment!.id,
        client_id: clientId,
        professional_id: block.professional_id,
        service_id: block.service_id,
        scheduled_at,
        duration_minutes: block.duration_minutes,
        status: status as any,
        notes: notes || undefined,
        price: block.price,
        group_id: groupId,
      });

      // Create additional services as new appointments
      if (serviceBlocks.length > 1 && onSubmitMultiple) {
        const newBlocks = serviceBlocks.slice(1);
        onSubmitMultiple({
          services: newBlocks.map((b) => ({
            client_id: clientId,
            professional_id: b.professional_id,
            service_id: b.service_id,
            scheduled_at: new Date(`${date}T${b.time}`).toISOString(),
            duration_minutes: b.duration_minutes,
            status: status as any,
            notes: notes || undefined,
            price: b.price,
            group_id: groupId,
          })),
        });
      }

      onOpenChange(false);
      return;
    }

    // Creating new: single or multiple
    if (serviceBlocks.length === 1) {
      const block = serviceBlocks[0];
      const scheduled_at = new Date(`${date}T${block.time}`).toISOString();
      onSubmit({
        client_id: clientId,
        professional_id: block.professional_id,
        service_id: block.service_id,
        scheduled_at,
        duration_minutes: block.duration_minutes,
        status: status as any,
        notes: notes || undefined,
        price: block.price,
      });
    } else if (onSubmitMultiple) {
      const groupId = crypto.randomUUID();
      const items: AppointmentInput[] = serviceBlocks.map((block) => ({
        client_id: clientId,
        professional_id: block.professional_id,
        service_id: block.service_id,
        scheduled_at: new Date(`${date}T${block.time}`).toISOString(),
        duration_minutes: block.duration_minutes,
        status: status as any,
        notes: notes || undefined,
        price: block.price,
        group_id: groupId,
      }));
      onSubmitMultiple({ services: items });
    } else {
      // Fallback: create one by one if onSubmitMultiple not provided
      serviceBlocks.forEach((block) => {
        const scheduled_at = new Date(`${date}T${block.time}`).toISOString();
        onSubmit({
          client_id: clientId,
          professional_id: block.professional_id,
          service_id: block.service_id,
          scheduled_at,
          duration_minutes: block.duration_minutes,
          status: status as any,
          notes: notes || undefined,
          price: block.price,
        });
      });
    }
    onOpenChange(false);
  };

  // Get selected client — always use current state (clientId), not the original appointment prop
  const selectedClient = useMemo(() => {
    return clientId ? clients.find((c) => c.id === clientId) : null;
  }, [appointment?.client_id, clientId, clients]);

  // Check if comanda button should show:
  // - NOT for future dates
  // - Today: always show
  // - Past dates: only if caixa for that day is open
  const [canOpenComanda, setCanOpenComanda] = useState(false);

  useEffect(() => {
    if (!appointment?.scheduled_at || !open) {
      setCanOpenComanda(false);
      return;
    }

    // Already paid: never allow
    if (appointment.status === "paid") {
      setCanOpenComanda(false);
      return;
    }

    const appointmentDate = new Date(appointment.scheduled_at);
    const today = new Date();

    // Future date: never
    if (isFuture(startOfDay(appointmentDate)) && !isSameDay(appointmentDate, today)) {
      setCanOpenComanda(false);
      return;
    }

    // Today: always
    if (isSameDay(appointmentDate, today)) {
      setCanOpenComanda(true);
      return;
    }

    // Past date: check if caixa is open for that day
    const dayStart = startOfDay(appointmentDate).toISOString();
    const dayEnd = new Date(startOfDay(appointmentDate).getTime() + 86400000 - 1).toISOString();
    supabase
      .from("caixas")
      .select("id")
      .gte("opened_at", dayStart)
      .lte("opened_at", dayEnd)
      .is("closed_at", null)
      .limit(1)
      .then(({ data }) => {
        setCanOpenComanda((data && data.length > 0) || false);
      });
  }, [appointment?.scheduled_at, open]);

  const handleOpenComanda = async () => {
    if (!appointment?.id) return;

    // Save any pending changes (e.g. client swap) before navigating
    const block = serviceBlocks[0];
    if (block) {
      const scheduled_at = new Date(`${date}T${block.time}`).toISOString();
      await supabase
        .from("appointments")
        .update({
          client_id: clientId || appointment.client_id,
          professional_id: block.professional_id,
          service_id: block.service_id,
          scheduled_at,
          duration_minutes: block.duration_minutes,
          status,
          notes: notes || null,
          price: block.price,
        })
        .eq("id", appointment.id);
    }

    navigate(`/comandas?appointment=${appointment.id}`);
    onOpenChange(false);
  };

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const activeProfessionals = useMemo(() => professionals.filter((p) => p.is_active), [professionals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
        </DialogHeader>

        {/* Client Info Header with Abrir Comanda button */}
        {isEditing && selectedClient && (
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-semibold">
                Cliente: {selectedClient.name.toUpperCase()}
              </p>
              {selectedClient.phone && (
                <p className="text-sm text-primary">Celular: {selectedClient.phone}</p>
              )}
            </div>
            {canOpenComanda && (
              <Button
                type="button"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleOpenComanda}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Abrir Comanda
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <ClientSearchSelect
              clients={clients}
              value={clientId || null}
              onSelect={(id) => setClientId(id || "")}
              onCreateNew={onCreateClient}
              onViewClient={onViewClient}
              placeholder="Buscar cliente..."
            />
            {!clientId && <p className="text-xs text-destructive">Cliente é obrigatório</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Service Blocks */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Serviços</Label>

            {serviceBlocks.map((block, index) => (
              <div
                key={block.id}
                className="border rounded-lg p-3 space-y-3 bg-muted/30 relative"
              >
                {/* Remove button */}
                {serviceBlocks.length > 1 && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeServiceBlock(index)}
                    title="Remover serviço"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Row 1: Service + Professional */}
                <div className="grid grid-cols-2 gap-3 pr-6">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Serviço *</Label>
                    <ServiceSearchSelect
                      services={activeServices}
                      value={block.service_id || null}
                      onSelect={(serviceId) => {
                        if (serviceId) handleServiceChangeInBlock(index, serviceId);
                      }}
                      placeholder="Buscar serviço..."
                      showPrice
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Profissional *</Label>
                    <Select
                      value={block.professional_id}
                      onValueChange={(v) => updateBlock(index, { professional_id: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProfessionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Time + Duration + Price */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Horário</Label>
                    <Input
                      type="time"
                      className="h-9"
                      value={block.time}
                      onChange={(e) => updateBlock(index, { time: e.target.value })}
                      disabled={index > 0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duração (min)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      min={5}
                      step={5}
                      value={block.duration_minutes}
                      onChange={(e) =>
                        updateBlock(index, {
                          duration_minutes: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      min={0}
                      step={0.01}
                      value={block.price}
                      onChange={(e) =>
                        updateBlock(index, { price: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add service button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addServiceBlock}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar serviço
            </Button>
          </div>

          {/* Summary (only show when multiple services) */}
          {serviceBlocks.length > 1 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {serviceBlocks.length} serviços
              </span>
              <span className="text-muted-foreground">
                Duração total: <span className="font-medium text-foreground">{formatDuration(totalDuration)}</span>
              </span>
              <span className="text-muted-foreground">
                Total: <span className="font-semibold text-foreground">R$ {totalPrice.toFixed(2)}</span>
              </span>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="completed">Finalizado</SelectItem>
                {status === "paid" && (
                  <SelectItem value="paid" disabled>Pago (automático)</SelectItem>
                )}
                <SelectItem value="no_show">Não Compareceu</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !clientId || !allBlocksValid}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
