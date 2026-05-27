// @ts-nocheck
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Sparkles, Clock } from "lucide-react";

export default function PortalLanding() {
  const { isAuthenticated, loading } = useClientPortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/cliente/agendar", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  return (
    <ClientLayout>
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Agendamento online</h1>
          <p className="text-muted-foreground text-sm">
            Marque seu horário em segundos, direto pelo celular.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Veja horários reais</div>
                <div className="text-xs text-muted-foreground">
                  Só aparece o que tá livre.
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">24h por dia</div>
                <div className="text-xs text-muted-foreground">
                  Sem esperar a recepção.
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Sua profissional</div>
                <div className="text-xs text-muted-foreground">
                  Você escolhe.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 max-w-sm mx-auto">
          <Button size="lg" className="w-full" onClick={() => navigate("/cliente/login")}>
            Entrar
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/cliente/cadastro")}
          >
            Criar conta
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cliente do salão?{" "}
            <Link to="/cliente/cadastro" className="text-primary underline">
              Vincule seu cadastro existente
            </Link>
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
