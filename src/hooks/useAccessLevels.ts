import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AccessLevel {
  id: string;
  salon_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  system_key: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AccessLevelPermission {
  id: string;
  access_level_id: string;
  permission_key: string;
  enabled: boolean;
}

export interface AccessLevelWithPermissions extends AccessLevel {
  permissions: Record<string, boolean>;
}

// AVEC-style: each feature has up to 4 action columns
export const PERMISSION_ACTIONS = [
  { key: "view", label: "Visualizar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "view_others", label: "Ver de outros prof." },
] as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[number]["key"];

export interface PermissionFeature {
  key: string;
  label: string;
  actions: PermissionAction[];
}

// AVEC-style feature list with available actions per feature
export const PERMISSION_FEATURES: PermissionFeature[] = [
  { key: "agenda", label: "Agenda", actions: ["view", "edit", "delete", "view_others"] },
  { key: "agenda_bloqueios", label: "Agenda Bloqueios", actions: ["view", "edit", "delete"] },
  { key: "caixas", label: "Caixas", actions: ["view", "view_others", "edit", "delete"] },
  { key: "clientes_dados", label: "Clientes Dados", actions: ["view", "edit", "delete"] },
  { key: "clientes_historico", label: "Clientes Histórico", actions: ["view"] },
  { key: "comandas", label: "Comandas", actions: ["view", "edit", "delete", "view_others"] },
  { key: "comandas_comissao", label: "Comandas (Comissão dos itens)", actions: ["edit"] },
  { key: "comandas_estorno", label: "Comandas (Estornar pagamentos)", actions: ["edit"] },
  { key: "comandas_itens", label: "Comandas (Itens das comandas)", actions: ["edit", "delete", "view_others"] },
  { key: "comandas_valores", label: "Comandas (Valor dos itens)", actions: ["edit"] },
  { key: "comissoes", label: "Comissões", actions: ["view", "edit"] },
  { key: "creditos_debitos", label: "Créditos e Débitos de Clientes", actions: ["edit", "delete"] },
  { key: "contas_pagar", label: "Contas a Pagar", actions: ["view", "edit", "delete"] },
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "debito_troco", label: "Débito/Troco na Comanda", actions: ["edit"] },
  { key: "entradas_saidas", label: "Entradas e Saídas", actions: ["view", "edit", "delete"] },
  { key: "estoque_produtos", label: "Estoque (Produtos)", actions: ["view", "edit", "delete"] },
  { key: "estoque_entrada_saida", label: "Estoque (Registrar Entrada/Saída)", actions: ["edit"] },
  { key: "grupo_acessos", label: "Grupo de Acessos", actions: ["view", "edit", "delete"] },
  { key: "historico_caixas", label: "Histórico de Caixas", actions: ["view", "edit", "delete"] },
  { key: "historico_comandas", label: "Histórico de Comandas", actions: ["view"] },
  { key: "informacoes", label: "Informações", actions: ["view", "edit", "delete"] },
  { key: "profissionais", label: "Profissionais", actions: ["view", "edit", "delete"] },
  { key: "relatorios", label: "Relatórios", actions: ["view", "view_others"] },
  { key: "servicos", label: "Serviços", actions: ["view", "edit", "delete"] },
];

// Legacy mapping - keep for backward compatibility
export const PERMISSION_CATEGORIES = {
  dashboard: { label: "Dashboard", permissions: ["dashboard.view"] },
  agenda: { label: "Agenda", permissions: ["agenda.view", "agenda.edit", "agenda.delete", "agenda.view_others"] },
  clients: { label: "Clientes", permissions: ["clientes_dados.view", "clientes_dados.edit", "clientes_dados.delete"] },
  comandas: { label: "Comandas", permissions: ["comandas.view", "comandas.edit", "comandas.delete"] },
  professionals: { label: "Profissionais", permissions: ["profissionais.view", "profissionais.edit", "profissionais.delete"] },
  services: { label: "Serviços", permissions: ["servicos.view", "servicos.edit", "servicos.delete"] },
  products: { label: "Produtos/Estoque", permissions: ["estoque_produtos.view", "estoque_produtos.edit", "estoque_produtos.delete"] },
  financial: { label: "Financeiro", permissions: ["entradas_saidas.view", "entradas_saidas.edit", "entradas_saidas.delete"] },
  caixa: { label: "Caixa", permissions: ["caixas.view", "caixas.view_others", "caixas.edit", "caixas.delete"] },
  commissions: { label: "Comissões", permissions: ["comissoes.view", "comissoes.edit"] },
  settings: { label: "Configurações", permissions: ["informacoes.view", "informacoes.edit", "grupo_acessos.view"] },
};

export const PERMISSION_LABELS: Record<string, string> = {};
// Generate labels from features
PERMISSION_FEATURES.forEach(f => {
  PERMISSION_ACTIONS.forEach(a => {
    PERMISSION_LABELS[`${f.key}.${a.key}`] = `${f.label} - ${a.label}`;
  });
});

// Get all possible permission keys
export function getAllPermissionKeys(): string[] {
  return PERMISSION_FEATURES.flatMap(f => f.actions.map(a => `${f.key}.${a}`));
}

export function useAccessLevels() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const accessLevelsQuery = useQuery({
    queryKey: ["access-levels", salonId],
    queryFn: async () => {
      if (!salonId) {
        console.warn("[useAccessLevels] salonId is null, returning empty");
        return [];
      }

      console.log("[useAccessLevels] Fetching access levels for salon:", salonId);

      const { data: levels, error: levelsError } = await supabase
        .from("access_levels")
        .select("*")
        .or(`salon_id.eq.${salonId},salon_id.is.null`)
        .order("is_system", { ascending: false })
        .order("name");

      if (levelsError) {
        console.error("[useAccessLevels] Error fetching levels:", levelsError);
        throw levelsError;
      }
      
      console.log("[useAccessLevels] Found levels:", levels?.length);
      if (!levels || levels.length === 0) return [];

      const levelIds = levels.map(l => l.id);
      const { data: permissions, error: permError } = await supabase
        .from("access_level_permissions")
        .select("*")
        .in("access_level_id", levelIds);

      if (permError) throw permError;

      const levelsWithPermissions: AccessLevelWithPermissions[] = levels.map(level => {
        const levelPerms = permissions?.filter(p => p.access_level_id === level.id) || [];
        const permissionsMap: Record<string, boolean> = {};
        levelPerms.forEach(p => {
          permissionsMap[p.permission_key] = p.enabled;
        });

        return {
          ...level,
          color: level.color || "#6366f1",
          permissions: permissionsMap,
        };
      });

      return levelsWithPermissions;
    },
    enabled: !!salonId,
  });

  const createAccessLevelMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      if (!salonId) throw new Error("Salão não encontrado");

      const { data: newLevel, error } = await supabase
        .from("access_levels")
        .insert({
          salon_id: salonId,
          name: data.name,
          description: data.description,
          color: data.color || "#6366f1",
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize all permissions as false
      const allPermissions = getAllPermissionKeys();
      const permInserts = allPermissions.map(key => ({
        access_level_id: newLevel.id,
        permission_key: key,
        enabled: false,
      }));

      const { error: permError } = await supabase
        .from("access_level_permissions")
        .insert(permInserts);

      if (permError) throw permError;

      return newLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-levels", salonId] });
      toast({ title: "Nível de acesso criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar nível de acesso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAccessLevelMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; color?: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("access_levels")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-levels", salonId] });
      toast({ title: "Nível de acesso atualizado!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nível de acesso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { accessLevelId: string; permissionKey: string; enabled: boolean }) => {
      // Try update first, if no rows affected, insert
      const { data: existing } = await supabase
        .from("access_level_permissions")
        .select("id")
        .eq("access_level_id", data.accessLevelId)
        .eq("permission_key", data.permissionKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("access_level_permissions")
          .update({ enabled: data.enabled })
          .eq("access_level_id", data.accessLevelId)
          .eq("permission_key", data.permissionKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("access_level_permissions")
          .insert({
            access_level_id: data.accessLevelId,
            permission_key: data.permissionKey,
            enabled: data.enabled,
          });
        if (error) throw error;
      }
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["access-levels", salonId] });
      const previous = queryClient.getQueryData<AccessLevelWithPermissions[]>(["access-levels", salonId]);
      queryClient.setQueryData<AccessLevelWithPermissions[]>(["access-levels", salonId], (old) => {
        if (!old) return old;
        return old.map(level => {
          if (level.id === data.accessLevelId) {
            return { ...level, permissions: { ...level.permissions, [data.permissionKey]: data.enabled } };
          }
          return level;
        });
      });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["access-levels", salonId], context.previous);
      }
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    },
    // Don't invalidate on settled to avoid flickering — the optimistic update is the source of truth
  });

  const deleteAccessLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("access_levels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-levels", salonId] });
      toast({ title: "Nível de acesso excluído!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir nível de acesso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    accessLevels: accessLevelsQuery.data ?? [],
    isLoading: accessLevelsQuery.isLoading,
    error: accessLevelsQuery.error,
    createAccessLevel: createAccessLevelMutation.mutate,
    updateAccessLevel: updateAccessLevelMutation.mutate,
    updatePermission: updatePermissionMutation.mutate,
    deleteAccessLevel: deleteAccessLevelMutation.mutate,
    isCreating: createAccessLevelMutation.isPending,
    isUpdating: updateAccessLevelMutation.isPending || updatePermissionMutation.isPending,
    isDeleting: deleteAccessLevelMutation.isPending,
  };
}
