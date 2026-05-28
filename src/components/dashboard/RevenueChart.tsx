// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function RevenueChart({ professionalId }: { professionalId?: string | null }) {
  const { salonId } = useAuth();
  const isProf = !!professionalId;

  const { data: chartData = [] } = useQuery({
    queryKey: ["dashboard-revenue-chart", salonId, professionalId ?? "salon"],
    queryFn: async () => {
      if (!salonId) return [];

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      // Build daily totals Mon-Sun
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { date: d, name: "", receita: 0 };
      });
      days[0].name = "Seg";
      days[1].name = "Ter";
      days[2].name = "Qua";
      days[3].name = "Qui";
      days[4].name = "Sex";
      days[5].name = "Sáb";
      days[6].name = "Dom";

      const bucket = (closedAt, value) => {
        if (!closedAt) return;
        const diffDays = Math.floor((new Date(closedAt).getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) days[diffDays].receita += value || 0;
      };

      if (isProf) {
        // Faturamento SÓ do profissional: soma os itens dele em comandas pagas da semana.
        const { data: items } = await supabase
          .from("comanda_items")
          .select("total_price, comandas!inner(closed_at, is_paid)")
          .eq("professional_id", professionalId)
          .eq("comandas.is_paid", true)
          .gte("comandas.closed_at", monday.toISOString())
          .lt("comandas.closed_at", sunday.toISOString());
        items?.forEach((it) => bucket(it.comandas?.closed_at, it.total_price || 0));
      } else {
        const { data: comandas } = await supabase
          .from("comandas")
          .select("total, closed_at")
          .eq("salon_id", salonId)
          .eq("is_paid", true)
          .gte("closed_at", monday.toISOString())
          .lt("closed_at", sunday.toISOString());
        comandas?.forEach((c) => bucket(c.closed_at, c.total || 0));
      }

      return days.map(({ name, receita }) => ({ name, receita }));
    },
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{isProf ? "Meu Faturamento da Semana" : "Faturamento da Semana"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  "Receita",
                ]}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReceita)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Faturamento Real</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
