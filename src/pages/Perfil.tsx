// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserCircle,
  Loader2,
  Save,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";

export default function Perfil() {
  const { user, salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: salon } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data } = await supabase.from("salons").select("name, trade_name").eq("id", salonId).single();
      return data;
    },
    enabled: !!salonId,
  });

  const { data: role } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  async function saveProfile() {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Atualiza perfil
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      // Atualiza e-mail no auth se mudou
      if (email && email !== user.email) {
        const { error: eErr } = await supabase.auth.updateUser({ email });
        if (eErr) throw eErr;
        toast({
          title: "Confirme seu novo e-mail",
          description: "Um link de confirmação foi enviado pra " + email,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil atualizado" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!newPwd || newPwd.length < 6) {
      toast({ title: "Senha precisa ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    if (!currentPwd) {
      toast({ title: "Informe a senha atual", variant: "destructive" });
      return;
    }
    setPwdSaving(true);
    try {
      // Re-autentica com senha atual (proteção contra session hijack)
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPwd,
      });
      if (signErr) {
        toast({ title: "Senha atual incorreta", variant: "destructive" });
        setPwdSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;

      toast({ title: "Senha alterada com sucesso" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      toast({ title: "Erro ao alterar senha", description: e.message, variant: "destructive" });
    } finally {
      setPwdSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      setAvatarUrl(url);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Foto atualizada" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const initials = (fullName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        </div>

        {/* Card Avatar + dados básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>
              Dados que aparecem em todo o sistema (agenda, comandas, relatórios).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Trocar foto
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG até 5MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
                <p className="text-xs text-muted-foreground">
                  Alterar e-mail exige confirmação por link.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Salão</Label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted/40 text-sm">
                  {salon?.trade_name || salon?.name || "—"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted/40 text-sm">
                  {role ? <Badge variant="outline">{role}</Badge> : "—"}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              A senha atual é exigida pra confirmar que é você.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cur">Senha atual</Label>
              <Input
                id="cur"
                type={showPwd ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Nova senha</Label>
              <div className="flex gap-2">
                <Input
                  id="new"
                  type={showPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Confirmar nova senha</Label>
              <Input
                id="conf"
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={changePassword} disabled={pwdSaving}>
                {pwdSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Alterar senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayoutNew>
  );
}
