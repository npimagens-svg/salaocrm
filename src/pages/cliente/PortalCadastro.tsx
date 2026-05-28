// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { useClientPortal, MatchInfo } from "@/hooks/useClientPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PortalCadastro() {
  const { signup, lookupMatch, isAuthenticated, loading } = useClientPortal();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Se já está logado, vai direto pra Agendar
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/cliente/agendar", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Match: cliente já cadastrado no salão?
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [matchChecking, setMatchChecking] = useState(false);
  const [linkExisting, setLinkExisting] = useState(false);

  // Faz lookup quando phone tem 11+ dígitos
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setMatch(null);
      setLinkExisting(false);
      return;
    }
    const t = setTimeout(async () => {
      setMatchChecking(true);
      try {
        const m = await lookupMatch(phone, undefined, undefined);
        setMatch(m);
        if (m && !m.has_auth) setLinkExisting(true);
        if (m && m.has_auth) setLinkExisting(false);
      } catch {
        setMatch(null);
      } finally {
        setMatchChecking(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [phone, lookupMatch]);

  // Match secundário por CPF (quando digita CPF completo)
  useEffect(() => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return;
    const t = setTimeout(async () => {
      try {
        const m = await lookupMatch(phone || undefined, cpf, undefined);
        if (m) {
          setMatch(m);
          if (!m.has_auth) setLinkExisting(true);
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [cpf, phone, lookupMatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !password) {
      toast({ title: "Preencha nome, telefone e senha", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha precisa ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPwd) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const r = await signup({
        name,
        phone,
        email: email || undefined,
        cpf: cpf || undefined,
        password,
        existing_client_id: linkExisting && match ? match.client_id : undefined,
      });
      toast({
        title: linkExisting ? "Conta vinculada!" : "Cadastro feito!",
        description: "Bora marcar seu primeiro horário.",
      });
      navigate("/cliente/agendar", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro no cadastro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || isAuthenticated) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Link to="/cliente" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Criar conta
          </CardTitle>
          <CardDescription>
            Preencha pra marcar seu horário. Se você já é cliente, identificamos automático.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Maria Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Celular (WhatsApp) *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="(11) 99999-9999"
              />
              {matchChecking && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando…
                </p>
              )}
            </div>

            {/* Match: cliente já existe */}
            {match && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  match.has_auth
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                    : "border-blue-500 bg-blue-50 dark:bg-blue-950"
                }`}
              >
                {match.has_auth ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <strong>Você já tem conta neste salão</strong>
                      <p className="text-xs">
                        Cadastro: <strong>{match.name_masked}</strong>. Use o login pra entrar.
                      </p>
                      <Link to="/cliente/login" className="text-xs text-primary underline">
                        Ir pro login
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                    <div>
                      <strong>Encontramos seu cadastro</strong>
                      <p className="text-xs">
                        Você já é cliente do salão: <strong>{match.name_masked}</strong>. Vamos só
                        criar sua senha pra você poder agendar online.
                      </p>
                      <label className="text-xs flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={linkExisting}
                          onChange={(e) => setLinkExisting(e.target.checked)}
                        />
                        Sim, é meu cadastro
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail (pra notificações)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pwd">Senha *</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conf">Confirmar senha *</Label>
              <Input
                id="conf"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || (match?.has_auth ?? false)}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {linkExisting ? "Criar minha senha" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Já tem conta?{" "}
            <Link to="/cliente/login" className="text-primary underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </ClientLayout>
  );
}
