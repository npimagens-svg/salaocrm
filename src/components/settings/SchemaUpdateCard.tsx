import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink, Download } from "lucide-react";
import { useSchemaVersion } from "@/hooks/useSchemaVersion";
import { LATEST_SCHEMA_VERSION, SCHEMA_MIGRATIONS } from "@/lib/schemaMigrations";
import { useToast } from "@/hooks/use-toast";

function extractProjectRef(): string {
  try {
    const url = localStorage.getItem("supabase_url") || "";
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}

export function SchemaUpdateCard() {
  const { toast } = useToast();
  const { current, latest, pending, isOutdated, isLoading, setVersion } = useSchemaVersion();

  const [open, setOpen] = useState(false);
  const [projectRef, setProjectRef] = useState(extractProjectRef());
  const [pat, setPat] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const runUpdate = async () => {
    if (!projectRef || !pat) {
      toast({ title: "Preencha Project Ref e PAT", variant: "destructive" });
      return;
    }

    setRunning(true);
    setProgress("Preparando...");

    try {
      for (const migration of pending) {
        setProgress(`Aplicando v${migration.version}: ${migration.name}`);
        const res = await fetch("/api/run-sql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectRef, pat, statements: migration.statements }),
        });
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const result = await res.json();
        if (result.errors > 0) {
          throw new Error(`v${migration.version} falhou: ${JSON.stringify(result.details).slice(0, 300)}`);
        }
        await setVersion(migration.version);
      }

      setProgress("Concluido!");
      toast({ title: "Sistema atualizado", description: `Versao ${latest} aplicada com sucesso.` });
      setTimeout(() => { setOpen(false); setPat(""); setProgress(""); }, 1500);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Atualizacoes do Sistema
            {isOutdated ? (
              <Badge variant="destructive">Atualizacao disponivel</Badge>
            ) : (
              <Badge variant="default" className="bg-green-600">Em dia</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Versao atual: v{current} — Versao mais recente: v{latest}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOutdated ? (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {pending.length} atualizacao(oes) pendente(s)
                </div>
                <ul className="text-sm text-amber-900 space-y-1 ml-6 list-disc">
                  {pending.map(m => (
                    <li key={m.version}>
                      <span className="font-semibold">v{m.version} — {m.name}</span>
                      <div className="text-xs text-amber-800/80">{m.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Atualizar Sistema
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Seu sistema esta atualizado com a versao mais recente.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Atualizar Sistema</DialogTitle>
            <DialogDescription>
              Para aplicar as atualizacoes, precisamos de um token de acesso do Supabase (Personal Access Token).
              Ele e usado apenas para rodar as mudancas de banco e nao fica salvo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="projectRef">Project Ref</Label>
              <Input
                id="projectRef"
                value={projectRef}
                onChange={(e) => setProjectRef(e.target.value)}
                placeholder="ex: abcdefghijklm"
                disabled={running}
              />
              <p className="text-xs text-muted-foreground">
                Aparece na URL do seu Supabase: https://supabase.com/dashboard/project/<span className="font-mono">abcdefghijklm</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat">Personal Access Token</Label>
              <Input
                id="pat"
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="sbp_..."
                disabled={running}
              />
              <a
                href="https://supabase.com/dashboard/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Gerar um token <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {running && (
              <div className="rounded-md bg-muted p-3 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
              Cancelar
            </Button>
            <Button onClick={runUpdate} disabled={running || !projectRef || !pat}>
              {running ? "Aplicando..." : `Aplicar ${pending.length} atualizacao(oes)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
