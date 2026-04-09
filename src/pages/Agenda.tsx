import { useEffect, useMemo, useState, useCallback } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Clock, Search, Loader2, Ban, List, Maximize2, Eye, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { useAppointments, AppointmentInput, MultiAppointmentInput, Appointment } from "@/hooks/useAppointments";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";
import { useAllProfessionalSchedules } from "@/hooks/useAllProfessionalSchedules";
import { AppointmentModal } from "@/components/modals/AppointmentModal";
import { BlockTimeModal, BlockTimeData } from "@/components/modals/BlockTimeModal";
import { AppointmentHoverCard } from "@/components/agenda/AppointmentHoverCard";
import { ClientModal } from "@/components/modals/ClientModal";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingCaixaCheck } from "@/hooks/usePendingCaixaCheck";
import { AlertTriangle } from "lucide-react";

function generateTimeSlots(openingTime: string, closingTime: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  const [openH, openM] = openingTime.split(":").map(Number);
  const [closeH, closeM] = closingTime.split(":").map(Number);
  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += intervalMinutes;
  }
  return slots;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-[#4a7c59]",      // Verde escuro - Agendado
  confirmed: "bg-[#3b82c4]",      // Azul - Confirmado
  in_progress: "bg-[#16a34a]",    // Verde vivo - Em Atendimento
  completed: "bg-[#3b5998]",      // Azul escuro - Finalizado
  paid: "bg-[#dc2626]",           // Vermelho - Pago
  awaiting: "bg-[#d4a127]",       // Dourado - Aguardando
  no_show: "bg-[#9ca3af]",        // Cinza claro - Faltou
  cancelled: "bg-[#6b7280]",      // Cinza - Cancelado
  blocked: "bg-[#34495e]",
};

const columnOptions = [3, 5, 8, 10, 12];

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchProfessional, setSearchProfessional] = useState("");
  const [searchAppointment, setSearchAppointment] = useState("");
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ professionalId: string; time: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [pendingClientName, setPendingClientName] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [maxColumns, setMaxColumns] = useState(10);
  const [expandCategories, setExpandCategories] = useState(false);
  const [mobileDatePickerOpen, setMobileDatePickerOpen] = useState(false);

  const { toast } = useToast();
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { hasPendingCaixa, message: pendingCaixaMessage } = usePendingCaixaCheck();
  const { appointments, isLoading: appointmentsLoading, createAppointment, createMultipleAppointments, updateAppointment, isCreating, isUpdating } = useAppointments(currentDate);
  const { professionals, isLoading: professionalsLoading } = useProfessionals();
  const { clients, createClient, updateClient } = useClients();
  const { services } = useServices();
  const { settings: schedulingSettings } = useSchedulingSettings();
  const { scheduleMap } = useAllProfessionalSchedules();

  // Salon working days array [sun, mon, tue, wed, thu, fri, sat]
  const salonWorkDays = useMemo(() => [
    schedulingSettings.sunday,
    schedulingSettings.monday,
    schedulingSettings.tuesday,
    schedulingSettings.wednesday,
    schedulingSettings.thursday,
    schedulingSettings.friday,
    schedulingSettings.saturday,
  ], [schedulingSettings]);

  // Check if a date is a salon working day
  const isSalonWorkDay = useCallback((date: Date) => {
    return salonWorkDays[date.getDay()];
  }, [salonWorkDays]);

  // Check if a professional works on a given day and time
  const isProfessionalAvailable = useCallback((professionalId: string, dayOfWeek: number, timeSlot: string) => {
    const profSchedules = scheduleMap[professionalId];
    // If no schedule configured, assume available during salon hours
    if (!profSchedules || profSchedules.length === 0) return true;

    return profSchedules.some((schedule) => {
      // Check if this day is enabled
      if (!schedule.days[dayOfWeek]) return false;

      // Check if time is within range
      const slotMinutes = parseInt(timeSlot.split(":")[0]) * 60 + parseInt(timeSlot.split(":")[1]);
      const startParts = schedule.start_time.split(":");
      const endParts = schedule.end_time.split(":");
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  }, [scheduleMap]);

  const timeSlots = useMemo(() => generateTimeSlots(
    schedulingSettings.opening_time,
    schedulingSettings.closing_time,
    schedulingSettings.slot_interval_minutes
  ), [schedulingSettings.opening_time, schedulingSettings.closing_time, schedulingSettings.slot_interval_minutes]);

  useEffect(() => {
    if (professionals.length > 0 && selectedProfessionalIds.length === 0) {
      setSelectedProfessionalIds(professionals.map((p) => p.id));
    }
  }, [professionals, selectedProfessionalIds.length]);

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, prev.getDate()));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, prev.getDate()));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousDay = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const goToNextDay = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Hoje";
    if (isTomorrow) return "Amanhã";
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  };

  const toggleProfessional = (id: string) => {
    setSelectedProfessionalIds(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedProfessionalIds.length === professionals.length) {
      setSelectedProfessionalIds([]);
    } else {
      setSelectedProfessionalIds(professionals.map(p => p.id));
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredProfessionals = professionals
    .filter(p =>
      p.is_active &&
      (selectedProfessionalIds.length === 0 || selectedProfessionalIds.includes(p.id)) &&
      p.name.toLowerCase().includes(searchProfessional.toLowerCase())
    )
    .slice(0, maxColumns);

  // Group professionals by role/specialty for sidebar
  const professionalsByCategory = useMemo(() => {
    const categories: Record<string, typeof professionals> = {};
    professionals.filter(p => p.is_active).forEach(prof => {
      const cat = prof.specialty || prof.role || "Geral";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(prof);
    });
    return categories;
  }, [professionals]);

  const getAppointmentsAtSlot = (professionalId: string, timeSlot: string) => {
    return appointments.filter(a => {
      const appointmentTime = format(new Date(a.scheduled_at), "HH:mm");
      const isBlocked = a.notes?.startsWith("🔒 BLOQUEADO:");
      if (a.status === "cancelled" && !isBlocked) return false;
      // Filter by search
      if (searchAppointment) {
        const search = searchAppointment.toLowerCase();
        const matchClient = a.clients?.name?.toLowerCase().includes(search);
        const matchService = a.services?.name?.toLowerCase().includes(search);
        if (!matchClient && !matchService) return false;
      }
      return a.professional_id === professionalId && appointmentTime === timeSlot;
    });
  };

  const handleSlotClick = (professionalId: string, time: string, appointment?: Appointment) => {
    if (appointment) {
      setSelectedAppointment(appointment);
    } else {
      setSelectedSlot({ professionalId, time });
      setSelectedAppointment(null);
    }
    setModalOpen(true);
  };

  const handleSubmit = (data: AppointmentInput & { id?: string }) => {
    if (!data.id && hasPendingCaixa) {
      toast({ title: "Caixa pendente", description: pendingCaixaMessage || "Finalize o caixa anterior antes de agendar.", variant: "destructive" });
      return;
    }
    if (data.id) {
      updateAppointment(data as AppointmentInput & { id: string });
    } else {
      createAppointment(data);
    }
  };

  const handleSubmitMultiple = (data: MultiAppointmentInput) => {
    createMultipleAppointments(data);
  };

  const [viewClientId, setViewClientId] = useState<string | null>(null);

  const handleCreateClient = (name: string) => {
    setPendingClientName(name);
    setClientModalOpen(true);
  };

  const handleViewClient = (clientId: string) => {
    setViewClientId(clientId);
    setClientModalOpen(true);
  };

  const viewClient = viewClientId ? clients.find(c => c.id === viewClientId) : null;

  const handleClientSubmit = (data: any) => {
    if (viewClientId) {
      updateClient({ ...data, id: viewClientId }, {
        onSuccess: () => {
          setClientModalOpen(false);
          setViewClientId(null);
        }
      });
    } else {
      createClient(data, {
        onSuccess: () => {
          setClientModalOpen(false);
          setPendingClientName("");
          setViewClientId(null);
        }
      });
    }
  };

  const handleBlockTime = async (data: BlockTimeData) => {
    if (!salonId) return;

    setIsBlocking(true);
    try {
      const scheduled_at = new Date(`${data.date}T${data.time}`).toISOString();

      const { error } = await supabase
        .from("appointments")
        .insert({
          salon_id: salonId,
          professional_id: data.professional_id,
          scheduled_at,
          duration_minutes: data.duration_minutes,
          status: "cancelled",
          notes: `🔒 BLOQUEADO: ${data.reason}`,
          client_id: null,
          service_id: null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Horário bloqueado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao bloquear horário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const getDefaultDateWithTime = () => {
    if (selectedSlot) {
      const date = new Date(currentDate);
      const [hours, minutes] = selectedSlot.time.split(":");
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    }
    return currentDate;
  };

  const isLoading = appointmentsLoading || professionalsLoading;

  return (
    <AppLayoutNew>
      {hasPendingCaixa && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border-b border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{pendingCaixaMessage} Vá em Financeiro para finalizar.</span>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-0 h-full">
        {/* Left Sidebar - Calendar & Filters */}
        <div className="lg:w-56 xl:w-64 lg:shrink-0 lg:border-r border-border bg-card">
          {/* Mini Calendar */}
          <div className="hidden md:block p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold capitalize">{formatMonthYear(currentDate)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && setCurrentDate(date)}
              disabled={(date) => !salonWorkDays[date.getDay()]}
              locale={ptBR}
              month={currentDate}
              onMonthChange={setCurrentDate}
              classNames={{
                months: "flex justify-center w-full",
                month: "w-full",
                caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                head_row: "flex justify-between",
                head_cell: "flex-1 text-center text-[0.7rem] font-medium text-muted-foreground py-1",
                row: "flex justify-between mt-1",
                cell: "flex-1 text-center h-7 p-0",
                day: "h-7 w-full text-xs p-0 font-normal hover:bg-accent rounded-md transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-semibold",
                day_outside: "text-muted-foreground opacity-40",
                day_disabled: "text-muted-foreground opacity-50",
              }}
              className="w-full p-0"
            />
          </div>

          {/* Professionals Filter */}
          <div className="p-3 space-y-3">
            <div className="font-semibold text-sm">Profissionais</div>
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar profissional"
                className="pl-8 h-8 text-xs"
                value={searchProfessional}
                onChange={(e) => setSearchProfessional(e.target.value)}
              />
              {searchProfessional && (
                <button
                  onClick={() => setSearchProfessional("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Mobile: Horizontal scroll */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={toggleAll}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border",
                  selectedProfessionalIds.length === professionals.length
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 border-border"
                )}
              >
                Todos
              </button>
              {professionals.filter(p => p.is_active).map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => toggleProfessional(prof.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border",
                    selectedProfessionalIds.includes(prof.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border"
                  )}
                >
                  {prof.nickname || prof.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Desktop: Categorized list like AVEC */}
            <div className="hidden md:block space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedProfessionalIds.length === professionals.filter(p => p.is_active).length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs font-medium">Todos</span>
                </div>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setExpandCategories(!expandCategories)}
                >
                  {expandCategories ? "Recolher Tudo" : "Expandir Tudo"}
                </button>
              </div>

              {Object.entries(professionalsByCategory).map(([category, profs]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={profs.every(p => selectedProfessionalIds.includes(p.id))}
                      onCheckedChange={() => {
                        const allSelected = profs.every(p => selectedProfessionalIds.includes(p.id));
                        if (allSelected) {
                          setSelectedProfessionalIds(prev => prev.filter(id => !profs.some(p => p.id === id)));
                        } else {
                          setSelectedProfessionalIds(prev => [...new Set([...prev, ...profs.map(p => p.id)])]);
                        }
                      }}
                    />
                    <button
                      onClick={() => setExpandCategories(!expandCategories)}
                      className="text-xs font-medium text-foreground flex items-center gap-1"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition-transform", expandCategories && "rotate-90")} />
                      {category}
                    </button>
                  </div>
                  {expandCategories && profs
                    .filter(p => p.name.toLowerCase().includes(searchProfessional.toLowerCase()))
                    .map((prof) => (
                      <div key={prof.id} className="flex items-center gap-2 pl-6 py-0.5">
                        <Checkbox
                          checked={selectedProfessionalIds.includes(prof.id)}
                          onCheckedChange={() => toggleProfessional(prof.id)}
                        />
                        <span className="text-xs">{prof.nickname || prof.name}</span>
                      </div>
                    ))}
                </div>
              ))}

              {professionals.filter(p => p.is_active).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum profissional cadastrado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Calendar Grid */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Controls Bar - Matches AVEC style */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
            {/* Mobile date display — arrows navigate by day, tap date opens calendar */}
            <div className="flex items-center gap-1 md:hidden w-full">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={mobileDatePickerOpen} onOpenChange={setMobileDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="flex-1 h-9 gap-1.5 text-sm font-medium capitalize">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDateDisplay(currentDate)}</span>
                    <span className="text-muted-foreground text-xs">
                      {currentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentDate(date);
                        setMobileDatePickerOpen(false);
                      }
                    }}
                    locale={ptBR}
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Left: Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium rounded-full px-4"
                onClick={goToToday}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium rounded-full px-3"
                onClick={() => {
                  setSelectedSlot(null);
                  setBlockModalOpen(true);
                }}
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                Bloquear Horário
              </Button>
            </div>

            {/* Right: Column selector, search, view toggles */}
            <div className="flex items-center gap-3">
              {/* Column Selector */}
              <div className="hidden lg:flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Ajustar colunas:</span>
                <div className="flex gap-0.5">
                  {columnOptions.map(num => (
                    <button
                      key={num}
                      onClick={() => setMaxColumns(num)}
                      className={cn(
                        "w-7 h-7 rounded-md text-xs font-medium transition-colors",
                        maxColumns === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-foreground hover:bg-muted/50"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Appointments */}
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar agendamento"
                  className="pl-8 h-8 text-xs w-44"
                  value={searchAppointment}
                  onChange={(e) => setSearchAppointment(e.target.value)}
                />
              </div>

              {/* View Toggle Icons */}
              <div className="hidden md:flex items-center gap-0.5 border border-border rounded-md">
                <button className="p-1.5 hover:bg-muted/30 rounded-l-md">
                  <List className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-1.5 hover:bg-muted/30">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="p-1.5 hover:bg-muted/30 rounded-r-md">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !isSalonWorkDay(currentDate) ? (
              <div className="text-center py-20 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Salão fechado neste dia</p>
                <p className="text-sm">
                  {currentDate.toLocaleDateString("pt-BR", { weekday: "long" })} não é um dia de funcionamento.
                </p>
                <Button variant="outline" className="mt-4" onClick={goToToday}>
                  Ir para Hoje
                </Button>
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="mb-4">Nenhum profissional cadastrado para exibir na agenda.</p>
                <Button onClick={() => window.location.href = '/profissionais'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Profissional
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto h-full scrollbar-hide">
                <div style={{ minWidth: `${filteredProfessionals.length * 120 + 56}px` }}>
                  {/* Professionals Header - Sticky */}
                  <div
                    className="grid sticky top-0 z-20 bg-[#f0f0f0] border-b-2 border-border"
                    style={{ gridTemplateColumns: `56px repeat(${filteredProfessionals.length}, 1fr)` }}
                  >
                    <div className="p-2 flex items-center justify-center border-r border-border">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {filteredProfessionals.map((professional) => (
                      <div key={professional.id} className="py-2 px-1 border-r border-border last:border-r-0 text-center">
                        <Avatar className="h-9 w-9 mx-auto mb-1 ring-2 ring-border">
                          {professional.avatar_url && (
                            <AvatarImage src={professional.avatar_url} alt={professional.name} />
                          )}
                          <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[11px] block uppercase tracking-wide text-foreground truncate">
                          {professional.nickname || professional.name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Time Slots Grid */}
                  <div>
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="grid border-b border-border/50"
                        style={{ gridTemplateColumns: `56px repeat(${filteredProfessionals.length}, 1fr)` }}
                      >
                        {/* Time Label */}
                        <div className="px-1 py-0 border-r border-border text-[11px] text-muted-foreground text-right pr-2 flex items-start justify-end pt-0.5 bg-card/50 font-medium">
                          {time}
                        </div>

                        {/* Professional Columns */}
                        {filteredProfessionals.map((professional) => {
                          const slotAppointments = getAppointmentsAtSlot(professional.id, time);
                          const dayOfWeek = currentDate.getDay();
                          const available = isProfessionalAvailable(professional.id, dayOfWeek, time);

                          return (
                            <div
                              key={`${professional.id}-${time}`}
                              className={cn(
                                "relative border-r border-border/30 last:border-r-0 h-[36px] transition-colors",
                                available
                                  ? "hover:bg-primary/5 cursor-pointer"
                                  : "bg-muted/40 cursor-not-allowed"
                              )}
                              onClick={() => available && handleSlotClick(professional.id, time)}
                            >
                              {slotAppointments.length > 0 && (
                                <div className="absolute inset-0 flex gap-px p-px z-10">
                                  {slotAppointments.map((appointment, apptIndex) => {
                                    const isBlocked = appointment.notes?.startsWith("🔒 BLOQUEADO:");
                                    const blockReason = isBlocked ? appointment.notes?.replace("🔒 BLOQUEADO: ", "") : null;
                                    const spans = Math.ceil(appointment.duration_minutes / 30);
                                    const totalOverlapping = slotAppointments.length;
                                    const hasOverlap = totalOverlapping > 1;

                                    return (
                                      <AppointmentHoverCard key={appointment.id} appointment={appointment} allAppointments={appointments}>
                                        <div
                                          className={cn(
                                            "rounded-sm px-1.5 py-0.5 cursor-pointer transition-shadow hover:shadow-lg hover:z-20 overflow-hidden text-white",
                                            isBlocked ? "bg-[#34495e]" : statusColors[appointment.status],
                                            hasOverlap && "border-l-2 border-white/40"
                                          )}
                                          style={{
                                            height: `${spans * 36 - 2}px`,
                                            position: "absolute",
                                            left: hasOverlap ? `${(apptIndex / totalOverlapping) * 100}%` : "1px",
                                            width: hasOverlap ? `${(1 / totalOverlapping) * 100 - 1}%` : "calc(100% - 2px)",
                                            top: "1px",
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isBlocked) {
                                              handleSlotClick(professional.id, time, appointment);
                                            }
                                          }}
                                        >
                                          {isBlocked ? (
                                            <>
                                              <div className="text-[10px] font-bold truncate flex items-center gap-1">
                                                <Ban className="h-2.5 w-2.5 shrink-0" /> BLOQUEADO
                                              </div>
                                              <div className="text-[9px] opacity-80 truncate">
                                                {blockReason}
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <div className="text-[10px] font-bold truncate leading-tight">
                                                {hasOverlap ? (appointment.clients?.name?.toUpperCase() || "CLIENTE") : `${time} ${appointment.clients?.name?.toUpperCase() || "CLIENTE"}`}
                                              </div>
                                              {appointment.services?.name && (
                                                <div className="text-[9px] font-medium opacity-90 truncate uppercase leading-tight">
                                                  {appointment.services.name}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </AppointmentHoverCard>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AppointmentModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedSlot(null);
            setSelectedAppointment(null);
          }
        }}
        appointment={selectedAppointment}
        clients={clients}
        professionals={professionals.filter(p => p.is_active)}
        services={services.filter(s => s.is_active)}
        onSubmit={handleSubmit}
        onSubmitMultiple={handleSubmitMultiple}
        isLoading={isCreating || isUpdating}
        defaultDate={getDefaultDateWithTime()}
        defaultProfessionalId={selectedSlot?.professionalId}
        onCreateClient={handleCreateClient}
        onViewClient={handleViewClient}
      />

      <BlockTimeModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        professionals={professionals.filter(p => p.is_active)}
        onSubmit={handleBlockTime}
        isLoading={isBlocking}
        defaultDate={currentDate}
        defaultProfessionalId={selectedSlot?.professionalId}
        defaultTime={selectedSlot?.time}
      />

      <ClientModal
        open={clientModalOpen}
        onOpenChange={(open) => {
          setClientModalOpen(open);
          if (!open) { setViewClientId(null); setPendingClientName(""); }
        }}
        onSubmit={handleClientSubmit}
        initialName={pendingClientName}
        client={viewClient || undefined}
      />
    </AppLayoutNew>
  );
}
