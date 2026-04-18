import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { LATEST_SCHEMA_VERSION, pendingMigrations } from "@/lib/schemaMigrations";

/**
 * Le a versao do schema aplicada no banco do cliente.
 * Se a chave nao existir, assume versao 1 (sistema pre-migration-runner).
 */
export function useSchemaVersion() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["schema-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "schema_version")
        .maybeSingle();
      if (error) throw error;
      const v = data?.value ? parseInt(data.value, 10) : 1;
      return Number.isFinite(v) ? v : 1;
    },
  });

  const current = query.data ?? 1;
  const latest = LATEST_SCHEMA_VERSION;
  const pending = pendingMigrations(current);
  const isOutdated = pending.length > 0;

  const setVersionMutation = useMutation({
    mutationFn: async (version: number) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({ key: "schema_version", value: String(version) }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-version"] });
    },
  });

  return {
    current,
    latest,
    pending,
    isOutdated,
    isLoading: query.isLoading,
    setVersion: setVersionMutation.mutateAsync,
  };
}
