// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2, ArrowLeft } from "lucide-react";

export default function PortalLogin() {
  const { login, isAuthenticated, loading } = useClientPortal();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Se já está logado quando entra nessa tela, vai direto pra Agendar
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/cliente/agendar", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) return;
    setSubmitting(true);
    try {
      await login(phone, password);
      navigate("/cliente/agendar", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro no login", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientLayout>
      <Link to="/cliente" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" /> Entrar
          </CardTitle>
          <CardDescription>Use telefone e senha que você cadastrou.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Não tem conta?{" "}
            <Link to="/cliente/cadastro" className="text-primary underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </ClientLayout>
  );
}
