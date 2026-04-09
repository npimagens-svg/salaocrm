import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Professional, ProfessionalInput } from "@/hooks/useProfessionals";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import type { AppRole } from "@/contexts/AuthContext";
import { useAccessLevels } from "@/hooks/useAccessLevels";

interface ProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSubmit: (data: ProfessionalInput & { id?: string }) => void;
  isLoading?: boolean;
}

const SPECIALTIES = [
  { value: "cabeleireiro", label: "Cabeleireiro(a)" },
  { value: "manicure", label: "Manicure" },
  { value: "esteticista", label: "Esteticista" },
  { value: "maquiador", label: "Maquiador(a)" },
  { value: "barbeiro", label: "Barbeiro" },
  { value: "depilador", label: "Depilador(a)" },
  { value: "massagista", label: "Massagista" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "gerente", label: "Gerente" },
  { value: "outro", label: "Outro" },
];

export function ProfessionalModal({ open, onOpenChange, professional, onSubmit, isLoading }: ProfessionalModalProps) {
  const { accessLevels, isLoading: isLoadingAccessLevels } = useAccessLevels();
  const accessLevelOptions = accessLevels.filter(
    (level) => level.system_key && level.system_key !== "admin"
  );

  const [formData, setFormData] = useState<ProfessionalInput>({
    name: "",
    nickname: "",
    cpf: "",
    role: "",
    email: "",
    phone: "",
    specialty: "",
    commission_percent: 0,
    is_active: true,
    can_be_assistant: false,
    has_schedule: true,
    create_access: false,
    avatar_url: null,
    access_level: "professional" as AppRole,
    access_level_id: undefined,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const isEditing = !!professional;
  const hasExistingAccess = professional?.create_access === true;

  useEffect(() => {
    if (professional) {
      setFormData({
        name: professional.name,
        nickname: (professional as any).nickname || "",
        cpf: (professional as any).cpf || "",
        role: (professional as any).role || "",
        email: professional.email || "",
        phone: professional.phone || "",
        specialty: professional.specialty || "",
        commission_percent: Number(professional.commission_percent) || 0,
        is_active: professional.is_active,
        can_be_assistant: (professional as any).can_be_assistant || false,
        has_schedule: (professional as any).has_schedule ?? true,
        create_access: (professional as any).create_access || false,
        avatar_url: professional.avatar_url || null,
        access_level: "professional" as AppRole,
        access_level_id: undefined,
      });
      setPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } else {
      setFormData({
        name: "",
        nickname: "",
        cpf: "",
        role: "",
        email: "",
        phone: "",
        specialty: "",
        commission_percent: 0,
        is_active: true,
        can_be_assistant: false,
        has_schedule: true,
        create_access: false,
        avatar_url: null,
        access_level: "professional" as AppRole,
        access_level_id: undefined,
      });
      setPassword("");
      setConfirmPassword("");
      setPasswordError("");
    }
  }, [professional, open]);

  useEffect(() => {
    if (!open || professional || accessLevelOptions.length === 0 || formData.access_level_id) return;

    const defaultLevel = accessLevelOptions.find((level) => level.system_key === "professional") || accessLevelOptions[0];
    if (!defaultLevel?.system_key) return;

    setFormData((prev) => ({
      ...prev,
      access_level: defaultLevel.system_key as AppRole,
      access_level_id: defaultLevel.id,
    }));
  }, [open, professional, accessLevelOptions, formData.access_level_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (formData.create_access && !hasExistingAccess) {
      if (!password) {
        setPasswordError("Informe uma senha para o acesso");
        return;
      }
      if (password.length < 6) {
        setPasswordError("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError("As senhas não conferem");
        return;
      }
      if (!formData.email) {
        setPasswordError("Informe um email para criar o acesso");
        return;
      }
      if (!formData.access_level_id || !formData.access_level) {
        setPasswordError("Selecione um grupo de acesso válido");
        return;
      }
    }

    const submitData = {
      ...formData,
      ...(professional ? { id: professional.id } : {}),
      ...(formData.create_access && !hasExistingAccess ? { password } : {}),
    };

    onSubmit(submitData as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl">
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <AvatarUpload
              currentAvatarUrl={formData.avatar_url}
              name={formData.name}
              onAvatarChange={(url) => setFormData({ ...formData, avatar_url: url })}
              folder="professionals"
              size="lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Qual é o <span className="font-semibold">nome completo</span>? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">
                Possui algum <span className="font-semibold">apelido</span>?
              </Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">
                Qual é o <span className="font-semibold">CPF</span>?
              </Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">
                Qual é a <span className="font-semibold">especialidade</span>? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((spec) => (
                    <SelectItem key={spec.value} value={spec.value}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Qual é o <span className="font-semibold">e-mail</span>?
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Qual é o <span className="font-semibold">telefone</span>?
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can_be_assistant"
                checked={formData.can_be_assistant}
                onCheckedChange={(checked) => setFormData({ ...formData, can_be_assistant: checked as boolean })}
              />
              <Label htmlFor="can_be_assistant" className="cursor-pointer">
                Esse profissional pode ser um assistente
              </Label>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_schedule"
                  checked={formData.has_schedule}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_schedule: checked as boolean })}
                />
                <Label htmlFor="has_schedule" className="cursor-pointer">
                  Esse profissional possui agenda
                </Label>
              </div>
            </div>

            {!hasExistingAccess ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create_access"
                    checked={formData.create_access}
                    onCheckedChange={(checked) => setFormData({ ...formData, create_access: checked as boolean })}
                  />
                  <Label htmlFor="create_access" className="cursor-pointer">
                    Criar acesso ao sistema
                  </Label>
                </div>

                {formData.create_access && (
                  <div className="ml-6 p-4 border rounded-lg bg-muted/30 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      O profissional poderá acessar o sistema com o email e senha definidos abaixo.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="access_level">
                        Nível de Acesso <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.access_level_id}
                        onValueChange={(value) => {
                          const selectedLevel = accessLevelOptions.find((level) => level.id === value);
                          setFormData((prev) => ({
                            ...prev,
                            access_level_id: value,
                            access_level: (selectedLevel?.system_key as AppRole | undefined) || prev.access_level || "professional",
                          }));
                        }}
                        disabled={isLoadingAccessLevels || accessLevelOptions.length === 0}
                      >
                        <SelectTrigger id="access_level">
                          <SelectValue placeholder={isLoadingAccessLevels ? "Carregando grupos..." : "Selecione o nível de acesso"} />
                        </SelectTrigger>
                        <SelectContent>
                          {accessLevelOptions.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{level.name}</span>
                                {level.description && (
                                  <span className="text-xs text-muted-foreground">{level.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isLoadingAccessLevels && accessLevelOptions.length === 0 && (
                        <p className="text-sm text-destructive">Nenhum grupo de acesso encontrado para este salão.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Senha <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirmar Senha <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirme a senha"
                        />
                      </div>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-green-700 dark:text-green-300">
                  Este profissional já possui acesso ao sistema
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
