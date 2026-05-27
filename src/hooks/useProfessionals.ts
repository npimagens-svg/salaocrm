import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Professional {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  nickname: string | null;
  cpf: string | null;
  rg: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  avatar_url: string | null;
  specialty: string | null;
  commission_percent: number | null;
  package_commission_percent: number | null;
  is_active: boolean;
  can_be_assistant: boolean | null;
  has_schedule: boolean | null;
  create_access: boolean | null;
  birth_date: string | null;
  description: string | null;
  agenda_color: string | null;
  agenda_order: number | null;
  site: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  cep: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Filtra profissionais que devem aparecer na AGENDA (colunas, slots, criação de
 * agendamento, bloqueios). Recepcionista/vendedora que recebe comissão mas não
 * atende cliente vem cadastrada com is_active=true + has_schedule=false e NÃO
 * deve aparecer aqui.
 *
 * has_schedule null = retro-compat com profissionais antigos antes da coluna
 * existir — assume true.
 */
export const canBookOnAgenda = (p: { is_active: boolean; has_schedule: boolean | null }): boolean =>
  !!p.is_active && p.has_schedule !== false;

export type AppRole = "admin" | "manager" | "receptionist" | "financial" | "professional";

export interface ProfessionalInput {
  name: string;
  nickname?: string;
  cpf?: string;
  rg?: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  specialty?: string;
  commission_percent?: number;
  package_commission_percent?: number;
  is_active?: boolean;
  can_be_assistant?: boolean;
  has_schedule?: boolean;
  create_access?: boolean;
  avatar_url?: string | null;
  birth_date?: string;
  description?: string;
  agenda_color?: string;
  agenda_order?: number;
  site?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  cep?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  password?: string;
  access_level?: AppRole;
  access_level_id?: string;
  user_id?: string | null;
}

export function useProfessionals() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["professionals", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("*").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProfessionalInput) => {
      if (!salonId) throw new Error("Salão não encontrado");

      const { password, access_level, access_level_id, ...professionalData } = input;

      if (professionalData.birth_date === "") professionalData.birth_date = null as any;

      const { data, error } = await supabase
        .from("professionals")
        .insert({ ...professionalData, salon_id: salonId, create_access: false })
        .select()
        .single();
      if (error) throw error;

      if (input.create_access && input.email && password) {
        const { error: accessError } = await supabase.functions.invoke("create-professional-access", {
          body: {
            email: input.email,
            password,
            fullName: input.name,
            salonId,
            professionalId: data.id,
            accessLevel: input.access_level || "professional",
            accessLevelId: access_level_id || null,
          },
        });

        if (accessError) {
          console.error("Error creating access:", accessError);
          throw new Error(`Profissional criado, mas erro ao criar acesso: ${accessError.message}`);
        }

        return { ...data, accessCreated: true };
      }

      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      if (data?.accessCreated) {
        toast({
          title: "Profissional criado com acesso!",
          description: "O profissional pode fazer login com o email e senha definidos.",
        });
      } else {
        toast({ title: "Profissional criado com sucesso!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar profissional", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ProfessionalInput & { id: string }) => {
      const { password, access_level, access_level_id, ...professionalData } = input;

      // Sanitize empty strings to null for date columns
      if (professionalData.birth_date === "") professionalData.birth_date = null as any;

      const { data, error } = await supabase
        .from("professionals")
        .update(professionalData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (input.create_access && input.email && password && !data.user_id) {
        const { error: accessError } = await supabase.functions.invoke("create-professional-access", {
          body: {
            email: input.email,
            password,
            fullName: input.name,
            salonId: data.salon_id,
            professionalId: data.id,
            accessLevel: input.access_level || "professional",
            accessLevelId: access_level_id || null,
          },
        });

        if (accessError) {
          console.error("Error creating access:", accessError);
          throw new Error(`Profissional atualizado, mas erro ao criar acesso: ${accessError.message}`);
        }

        return { ...data, accessCreated: true };
      }

      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      if (data?.accessCreated) {
        toast({
          title: "Profissional atualizado com acesso!",
          description: "O profissional pode fazer login com o email e senha definidos.",
        });
      } else {
        toast({ title: "Profissional atualizado com sucesso!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar profissional", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, targetProfessionalId }: { id: string; targetProfessionalId?: string | null }) => {
      if (targetProfessionalId) {
        const now = new Date().toISOString();
        const { error: transferError } = await supabase
          .from("appointments")
          .update({ professional_id: targetProfessionalId })
          .eq("professional_id", id)
          .gte("scheduled_at", now)
          .neq("status", "cancelled");

        if (transferError) throw transferError;
      }

      const { error } = await supabase
        .from("professionals")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      queryClient.invalidateQueries({ queryKey: ["appointments", salonId] });
      toast({ title: "Profissional desativado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao desativar profissional", description: error.message, variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("professionals")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals", salonId] });
      toast({ title: "Profissional reativado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao reativar profissional", description: error.message, variant: "destructive" });
    },
  });

  return {
    professionals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProfessional: createMutation.mutate,
    updateProfessional: updateMutation.mutate,
    deactivateProfessional: deleteMutation.mutate,
    reactivateProfessional: reactivateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deleteMutation.isPending,
    isReactivating: reactivateMutation.isPending,
  };
}
