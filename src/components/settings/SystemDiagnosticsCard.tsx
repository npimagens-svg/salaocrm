import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Brush } from "lucide-react";
import { useSystemDiagnostics } from "@/hooks/useSystemDiagnostics";

export function SystemDiagnosticsCard() {
  const { checks, isLoading, refetch, clean, isCleaning } = useSystemDiagnostics();

  const problemsCount = checks.filter(c => c.severity !== "ok").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Diagnostico do Sistema
          {!isLoading && problemsCount === 0 && <Badge className="bg-green-600">Tudo ok</Badge>}
          {problemsCount > 0 && <Badge variant="destructive">{problemsCount} problema(s)</Badge>}
        </CardTitle>
        <CardDescription>
          Verifica inconsistencias no banco (registros orfaos, estados invalidos). Rode aqui se alguem reportar
          divida/credito "fantasma" ou comportamento estranho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {checks.map((check) => (
              <div
                key={check.key}
                className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
                  check.severity === "ok" ? "border-green-200 bg-green-50/50" :
                  check.severity === "warning" ? "border-amber-200 bg-amber-50" :
                  "border-destructive bg-destructive/10"
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  {check.severity === "ok" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {check.label} {check.count > 0 && <span className="font-bold">({check.count})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                  </div>
                </div>
                {check.canClean && check.count > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clean(check.key)}
                    disabled={isCleaning}
                    className="gap-1 flex-shrink-0"
                  >
                    <Brush className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                )}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading} className="gap-1">
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Rodar checks de novo
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
