import { useAppUpdateCheck } from "@/hooks/useAppUpdateCheck";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function AppUpdateBanner() {
  const { updateAvailable, reload } = useAppUpdateCheck();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] max-w-md w-[calc(100%-2rem)]">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-3 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Nova versão disponível</p>
          <p className="text-xs opacity-90">Atualize para receber as últimas melhorias.</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={reload}
          className="shrink-0"
        >
          Atualizar
        </Button>
      </div>
    </div>
  );
}
