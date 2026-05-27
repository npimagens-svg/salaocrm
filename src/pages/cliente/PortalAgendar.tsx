// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, ChevronRight, ArrowLeft, CheckCircle2, Clock } from "lucide-react";

type Service = { id: string; name: string; duration_minutes: number; price: number; category: string | null };
type Professional = { id: string; name: string; nickname: string | null; avatar_url: string | null; specialty: string | null };

export default function PortalAgendar() {
  const { isAuthenticated, loading, listServices, listProfessionals, listSlots, createAppointment } =
    useClientPortal();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"service" | "prof" | "slot" | "confirm">("service");
  const [services, setServices] = useState<Service[]>([]);
  const [pros, setPros] = useState<Professional[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);

  const [chosenService, setChosenService] = useState<Service | null>(null);
  const [chosenPro, setChosenPro] = useState<Professional | null>(null);
  const [chosenDate, setChosenDate] = useState<string>(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1); // amanhã
    return t.toISOString().slice(0, 10);
  });
  const [chosenSlot, setChosenSlot] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/cliente/login", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  // Step 1: carrega serviços
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingStep(true);
    listServices()
      .then(setServices)
      .finally(() => setLoadingStep(false));
  }, [isAuthenticated, listServices]);

  // Step 2: profissionais que atendem o serviço
  useEffect(() => {
    if (!chosenService) return;
    setLoadingStep(true);
    listProfessionals(chosenService.id)
      .then(setPros)
      .finally(() => setLoadingStep(false));
  }, [chosenService, listProfessionals]);

  // Step 3: slots
  useEffect(() => {
    if (!chosenPro || !chosenService || !chosenDate) return;
    setLoadingStep(true);
    setSlots([]);
    setSlotMsg(null);
    listSlots(chosenPro.id, chosenService.id, chosenDate)
      .then((r: any) => {
        setSlots(r.slots ?? []);
        setSlotMsg(r.reason ?? null);
      })
      .finally(() => setLoadingStep(false));
  }, [chosenPro, chosenService, chosenDate, listSlots]);

  async function handleConfirm() {
    if (!chosenService || !chosenPro || !chosenSlot) return;
    setConfirming(true);
    try {
      const [h, m] = chosenSlot.split(":").map(Number);
      const scheduled = new Date(`${chosenDate}T00:00:00`);
      scheduled.setHours(h, m, 0, 0);

      await createAppointment({
        professional_id: chosenPro.id,
        service_id: chosenService.id,
        scheduled_at: scheduled.toISOString(),
      });
      toast({ title: "Horário marcado!", description: "Confere em Meus horários." });
      navigate("/cliente/agendamentos", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro ao marcar", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  }

  function reset() {
    setStep("service");
    setChosenService(null);
    setChosenPro(null);
    setChosenSlot(null);
    setPros([]);
    setSlots([]);
  }

  // Próximos 14 dias pra escolher
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().slice(0, 10);
  });

  return (
    <ClientLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Marcar horário</h1>
          <p className="text-sm text-muted-foreground">
            Escolha serviço → profissional → dia → horário.
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button onClick={reset} className="hover:text-primary">Serviço</button>
          <ChevronRight className="h-3 w-3" />
          <span className={chosenService ? "text-foreground" : ""}>
            {chosenService ? chosenService.name.slice(0, 20) : "Profissional"}
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className={chosenPro ? "text-foreground" : ""}>
            {chosenPro ? chosenPro.nickname || chosenPro.name.split(" ")[0] : "Dia + horário"}
          </span>
        </div>

        {/* STEP 1: SERVICE */}
        {step === "service" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Que serviço você quer?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingStep && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
              {!loadingStep && services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ainda não temos serviços disponíveis online. Entre em contato pelo WhatsApp.
                </p>
              )}
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setChosenService(s);
                    setStep("prof");
                  }}
                  className="w-full flex items-center justify-between border rounded-lg px-3 py-3 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span><Clock className="h-3 w-3 inline" /> {s.duration_minutes}min</span>
                      <span>R$ {Number(s.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* STEP 2: PROFESSIONAL */}
        {step === "prof" && chosenService && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Com quem você quer atender?</CardTitle>
              <CardDescription>Serviço: {chosenService.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingStep && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
              {!loadingStep && pros.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum profissional disponível pra esse serviço.
                </p>
              )}
              {pros.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setChosenPro(p);
                    setStep("slot");
                  }}
                  className="w-full flex items-center gap-3 border rounded-lg px-3 py-3 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{p.nickname || p.name}</div>
                    {p.specialty && (
                      <div className="text-xs text-muted-foreground">{p.specialty}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStep("service")} className="w-full">
                <ArrowLeft className="mr-2 h-3 w-3" /> Trocar serviço
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DAY + SLOT */}
        {step === "slot" && chosenPro && chosenService && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quando?</CardTitle>
              <CardDescription>
                {chosenService.name} com {chosenPro.nickname || chosenPro.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day chooser */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {dateOptions.map((d) => {
                  const date = new Date(d + "T12:00:00");
                  const dow = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()];
                  const day = date.getDate();
                  const month = date.toLocaleDateString("pt-BR", { month: "short" }).slice(0, 3);
                  return (
                    <button
                      key={d}
                      onClick={() => setChosenDate(d)}
                      className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-xs ${
                        chosenDate === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      <span className="font-medium">{dow}</span>
                      <span className="text-lg font-bold leading-none">{day}</span>
                      <span className="text-[10px]">{month}</span>
                    </button>
                  );
                })}
              </div>

              {/* Slots grid */}
              {loadingStep ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {slotMsg || "Nenhum horário livre nesse dia. Tente outra data."}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setChosenSlot(s);
                        setStep("confirm");
                      }}
                      className="px-3 py-2 rounded border text-sm hover:border-primary hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => setStep("prof")} className="w-full">
                <ArrowLeft className="mr-2 h-3 w-3" /> Trocar profissional
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: CONFIRM */}
        {step === "confirm" && chosenSlot && chosenPro && chosenService && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmar agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">{chosenService.name}</span>
                </div>
                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{chosenPro.nickname || chosenPro.name}</span>
                </div>
                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Quando</span>
                  <span className="font-medium">
                    {new Date(`${chosenDate}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}{" "}
                    às {chosenSlot}
                  </span>
                </div>
                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="font-medium">{chosenService.duration_minutes} minutos</span>
                </div>
                <div className="text-sm flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold">
                    R$ {Number(chosenService.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={confirming}
                onClick={handleConfirm}
              >
                {confirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirmar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep("slot")} className="w-full">
                <ArrowLeft className="mr-2 h-3 w-3" /> Trocar horário
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
