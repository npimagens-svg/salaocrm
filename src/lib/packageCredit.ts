import { supabase } from "@/lib/dynamicSupabaseClient";

export interface PackageCreditResult {
  usedCredit: boolean;
  finalPrice: number;
  description: string;
  packageLabel: string;
}

// Selo usado na descrição de item debitado de pacote. Serve também pra
// reconhecer itens já creditados (ex.: pra não sobrescrever o preço no sync).
export const PACKAGE_CREDIT_BADGE = "📦";

// Verifica se o cliente tem um pacote ativo com crédito para o serviço.
// Se tiver, registra o uso (client_package_usage) e devolve preço 0 +
// descrição com o selo do pacote. Senão, devolve o preço cheio.
//
// É a mesma regra do "adicionar serviço manual" — centralizada aqui pra que
// abrir a comanda pelo agendamento e o botão Atualizar também debitem o pacote.
export async function checkAndConsumePackageCredit(params: {
  clientId: string | null | undefined;
  salonId: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  comandaId: string;
  professionalId?: string | null;
  note?: string;
}): Promise<PackageCreditResult> {
  const {
    clientId,
    salonId,
    serviceId,
    serviceName,
    servicePrice,
    comandaId,
    professionalId,
    note,
  } = params;

  const fullPrice: PackageCreditResult = {
    usedCredit: false,
    finalPrice: Number(servicePrice) || 0,
    description: serviceName,
    packageLabel: "",
  };

  if (!clientId) return fullPrice;

  try {
    const { data: clientPackages } = await supabase
      .from("client_packages")
      .select("id, package_id")
      .eq("client_id", clientId)
      .eq("salon_id", salonId)
      .eq("status", "active");

    if (!clientPackages || clientPackages.length === 0) return fullPrice;

    for (const cp of clientPackages) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("name")
        .eq("id", cp.package_id)
        .single();

      const { data: pkgItem } = await supabase
        .from("package_items")
        .select("quantity")
        .eq("package_id", cp.package_id)
        .eq("service_id", serviceId)
        .maybeSingle();

      if (!pkgItem) continue;
      const totalCredits = pkgItem.quantity;

      const { count: usageCount } = await supabase
        .from("client_package_usage")
        .select("id", { count: "exact", head: true })
        .eq("client_package_id", cp.id)
        .eq("service_id", serviceId);

      const used = usageCount || 0;
      if (used < totalCredits) {
        await supabase.from("client_package_usage").insert({
          client_package_id: cp.id,
          service_id: serviceId,
          comanda_id: comandaId,
          professional_id: professionalId || null,
          notes: note || "Uso automático via comanda",
        });

        const pkgName = pkg?.name || "Pacote";
        const packageLabel = `${PACKAGE_CREDIT_BADGE} ${pkgName} (${used + 1}/${totalCredits})`;
        return {
          usedCredit: true,
          finalPrice: 0,
          description: `${serviceName} — ${packageLabel}`,
          packageLabel,
        };
      }
    }
  } catch (e) {
    console.error("Erro ao verificar pacotes do cliente:", e);
  }

  return fullPrice;
}
