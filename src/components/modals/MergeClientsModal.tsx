import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Check, Loader2, Merge, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Client, ClientInput } from "@/hooks/useClients";
import { useMergeClients, useMergeCounts, MergeCounts } from "@/hooks/useMergeClients";

interface MergeClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
}

type Step = "select" | "fields" | "confirm";

interface FieldDef {
  key: keyof ClientInput;
  label: string;
  type: "text" | "textarea" | "tags" | "boolean";
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "Nome", type: "text" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "phone_landline", label: "Fixo", type: "text" },
  { key: "birth_date", label: "Nascimento", type: "text" },
  { key: "gender", label: "Gênero", type: "text" },
  { key: "cpf", label: "CPF", type: "text" },
  { key: "rg", label: "RG", type: "text" },
  { key: "profession", label: "Profissão", type: "text" },
  { key: "how_met", label: "Como conheceu", type: "text" },
  { key: "cep", label: "CEP", type: "text" },
  { key: "state", label: "Estado", type: "text" },
  { key: "city", label: "Cidade", type: "text" },
  { key: "neighborhood", label: "Bairro", type: "text" },
  { key: "address", label: "Endereço", type: "text" },
  { key: "address_number", label: "Número", type: "text" },
  { key: "address_complement", label: "Complemento", type: "text" },
  { key: "avatar_url", label: "Avatar", type: "text" },
  { key: "notes", label: "Observações", type: "textarea" },
  { key: "tags", label: "Tags", type: "tags" },
  { key: "allow_email_campaigns", label: "Aceita e-mail", type: "boolean" },
  { key: "allow_sms_campaigns", label: "Aceita SMS", type: "boolean" },
  { key: "allow_whatsapp_campaigns", label: "Aceita WhatsApp", type: "boolean" },
  { key: "allow_online_booking", label: "Agendamento online", type: "boolean" },
  { key: "add_cpf_invoice", label: "CPF na nota", type: "boolean" },
  { key: "allow_ai_service", label: "Atendimento IA", type: "boolean" },
];

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function ClientPicker({
  clients,
  value,
  excludeId,
  onSelect,
  placeholder,
}: {
  clients: Client[];
  value: string | null;
  excludeId?: string | null;
  onSelect: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = clients.find((c) => c.id === value);
  const filtered = clients
    .filter((c) => c.id !== excludeId)
    .filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.cpf ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? `${selected.name}${selected.phone ? ` — ${selected.phone}` : ""}` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
        <Command shouldFilter={false}>
          <div className="border-b p-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, CPF ou e-mail..."
              className="h-9"
            />
          </div>
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onSelect(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[c.phone, c.email, c.cpf].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {value === c.id && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CountsList({ counts }: { counts: MergeCounts }) {
  const items: Array<[string, number]> = [
    ["Comandas", counts.comandas],
    ["Agendamentos", counts.appointments],
    ["Histórico de serviços", counts.client_history],
    ["Créditos / cashback", counts.client_credits],
    ["Dívidas", counts.client_debts],
    ["Saldo", counts.client_balance],
    ["Pacotes", counts.client_packages],
    ["Alertas", counts.client_alerts],
    ["Logs de e-mail", counts.email_logs],
    ["Movimentos de estoque", counts.stock_movements],
    ["Comandas deletadas (log)", counts.comanda_deletions],
    ["Campanhas de e-mail", counts.email_campaigns],
    ["Campanhas de SMS", counts.sms_campaigns],
  ];
  const total = items.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        O cliente duplicado não tem nenhum registro vinculado — ele apenas será removido.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {items
        .filter(([, n]) => n > 0)
        .map(([label, n]) => (
          <li key={label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <Badge variant="secondary">{n}</Badge>
          </li>
        ))}
    </ul>
  );
}

export function MergeClientsModal({ open, onOpenChange, clients }: MergeClientsModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);

  const winner = clients.find((c) => c.id === winnerId) ?? null;
  const loser = clients.find((c) => c.id === loserId) ?? null;

  const [choices, setChoices] = useState<Record<string, "winner" | "loser">>({});
  const [notesOverride, setNotesOverride] = useState<string>("");
  const [combineTags, setCombineTags] = useState<boolean>(true);

  const { data: counts, isLoading: countsLoading } = useMergeCounts(loserId);
  const merge = useMergeClients();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("select");
      setWinnerId(null);
      setLoserId(null);
      setChoices({});
      setNotesOverride("");
      setCombineTags(true);
    }
  }, [open]);

  // Default choices when both clients selected: prefer winner, fallback to loser if winner is empty
  useEffect(() => {
    if (!winner || !loser) return;
    const next: Record<string, "winner" | "loser"> = {};
    for (const f of FIELDS) {
      if (f.type === "tags") continue;
      const w = (winner as unknown as Record<string, unknown>)[f.key as string];
      next[f.key as string] = isEmpty(w) ? "loser" : "winner";
    }
    setChoices(next);
    const wn = (winner.notes ?? "").trim();
    const ln = (loser.notes ?? "").trim();
    if (wn && ln && wn !== ln) {
      setNotesOverride(`${wn}\n---\n${ln}`);
    } else {
      setNotesOverride(wn || ln || "");
    }
  }, [winner?.id, loser?.id]);

  const finalData = useMemo<ClientInput | null>(() => {
    if (!winner || !loser) return null;
    const out: Record<string, unknown> = {};
    for (const f of FIELDS) {
      if (f.key === "notes") {
        out.notes = notesOverride;
        continue;
      }
      if (f.key === "tags") {
        if (combineTags) {
          const a = winner.tags ?? [];
          const b = loser.tags ?? [];
          out.tags = Array.from(new Set([...a, ...b]));
        } else {
          out.tags = choices.tags === "loser" ? (loser.tags ?? []) : (winner.tags ?? []);
        }
        continue;
      }
      const pick = choices[f.key as string] ?? "winner";
      const src = pick === "winner" ? winner : loser;
      out[f.key as string] = (src as unknown as Record<string, unknown>)[f.key as string] ?? null;
    }
    return out as ClientInput;
  }, [winner, loser, choices, notesOverride, combineTags]);

  const canGoToFields = !!winnerId && !!loserId && winnerId !== loserId;

  const handleConfirm = () => {
    if (!winnerId || !loserId || !finalData) return;
    merge.mutate(
      { winnerId, loserId, winnerData: finalData },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Unir Cadastros Duplicados
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Escolha os dois cadastros a unir. O Cliente Principal é o que vai sobrar."}
            {step === "fields" && "Para cada campo, escolha qual valor manter."}
            {step === "confirm" && "Confirme: a fusão é definitiva."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente Principal (este vai ficar)</Label>
              <ClientPicker
                clients={clients}
                value={winnerId}
                excludeId={loserId}
                onSelect={setWinnerId}
                placeholder="Selecione o cliente principal..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente Duplicado (este será removido)</Label>
              <ClientPicker
                clients={clients}
                value={loserId}
                excludeId={winnerId}
                onSelect={setLoserId}
                placeholder="Selecione o cliente duplicado..."
              />
            </div>
            {!!loserId && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-medium">Itens que serão migrados:</p>
                {countsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </div>
                ) : counts ? (
                  <CountsList counts={counts} />
                ) : null}
              </div>
            )}
          </div>
        )}

        {step === "fields" && winner && loser && (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-[160px_1fr_1fr] gap-3 text-xs font-semibold text-muted-foreground sticky top-0 bg-background pb-2 border-b">
                <div>Campo</div>
                <div>{winner.name} (Principal)</div>
                <div>{loser.name} (Duplicado)</div>
              </div>
              {FIELDS.map((f) => {
                if (f.key === "notes") {
                  return (
                    <div key={f.key} className="grid grid-cols-[160px_1fr] gap-3 items-start">
                      <Label className="pt-2">{f.label}</Label>
                      <Textarea
                        value={notesOverride}
                        onChange={(e) => setNotesOverride(e.target.value)}
                        rows={3}
                        placeholder="Observações combinadas (edite à vontade)"
                      />
                    </div>
                  );
                }
                if (f.key === "tags") {
                  return (
                    <div key={f.key} className="grid grid-cols-[160px_1fr] gap-3 items-start">
                      <Label className="pt-2">{f.label}</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="combine-tags"
                            checked={combineTags}
                            onCheckedChange={(v) => setCombineTags(!!v)}
                          />
                          <Label htmlFor="combine-tags" className="text-sm font-normal cursor-pointer">
                            Combinar tags dos dois
                          </Label>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(combineTags
                            ? Array.from(new Set([...(winner.tags ?? []), ...(loser.tags ?? [])]))
                            : (choices.tags === "loser" ? loser.tags : winner.tags) ?? []
                          ).map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                          {(winner.tags ?? []).length === 0 && (loser.tags ?? []).length === 0 && (
                            <span className="text-xs text-muted-foreground">Nenhuma tag</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                const w = (winner as unknown as Record<string, unknown>)[f.key as string];
                const l = (loser as unknown as Record<string, unknown>)[f.key as string];
                const renderVal = (v: unknown) => {
                  if (isEmpty(v)) return <span className="text-xs italic text-muted-foreground">vazio</span>;
                  if (typeof v === "boolean") return v ? "Sim" : "Não";
                  return String(v);
                };
                const equal = String(w ?? "") === String(l ?? "");
                const pick = choices[f.key as string] ?? "winner";
                return (
                  <div key={f.key} className="grid grid-cols-[160px_1fr_1fr] gap-3 items-start">
                    <Label className="pt-2">{f.label}</Label>
                    <button
                      type="button"
                      onClick={() => setChoices((p) => ({ ...p, [f.key as string]: "winner" }))}
                      className={cn(
                        "rounded-md border p-2 text-left text-sm break-all transition-colors",
                        pick === "winner"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-input hover:border-muted-foreground/50",
                      )}
                    >
                      {renderVal(w)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChoices((p) => ({ ...p, [f.key as string]: "loser" }))}
                      className={cn(
                        "rounded-md border p-2 text-left text-sm break-all transition-colors",
                        pick === "loser"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-input hover:border-muted-foreground/50",
                        equal && "opacity-60",
                      )}
                    >
                      {renderVal(l)}
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {step === "confirm" && winner && loser && counts && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">Esta ação não pode ser desfeita.</p>
                <p>
                  O cadastro <strong>{loser.name}</strong> será removido. Todo o histórico será movido para{" "}
                  <strong>{winner.name}</strong>.
                </p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Resumo da migração:</p>
              <CountsList counts={counts} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "select" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!canGoToFields} onClick={() => setStep("fields")}>
                Próximo: escolher campos
              </Button>
            </>
          )}
          {step === "fields" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("confirm")}>Próximo: revisar</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("fields")} disabled={merge.isPending}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={merge.isPending}>
                {merge.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Unir cadastros
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
