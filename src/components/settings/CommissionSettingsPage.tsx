import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, CalendarClock, Settings2, FileText, Sparkles } from "lucide-react";
import { useCommissionSettings, CommissionSettings } from "@/hooks/useCommissionSettings";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

type SettingsForm = Omit<CommissionSettings, "id" | "salon_id">;

export function CommissionSettingsPage() {
  const navigate = useNavigate();
  const { settings, isLoading, save, isSaving } = useCommissionSettings();
  const [form, setForm] = useState<SettingsForm>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setForm(settings);
    setHasChanges(false);
  }, [JSON.stringify(settings)]);

  const update = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    save(form);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
          <Button variant="outline" onClick={() => navigate("/comissoes")}>
            Ver Comissões a pagar
          </Button>
        </div>
      </div>

      {/* ===== SEÇÃO 1: DATA DE RECEBIMENTO ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Data de Recebimento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina as <strong>datas de pagamento</strong> das comissões dos seus <strong>profissionais</strong>:
          </p>

          <div className="space-y-4 bg-muted/30 rounded-lg p-4">
            <div>
              <p className="text-sm mb-2">
                Se o cliente pagou o serviço com <strong>cartão</strong>, seus profissionais receberão na:
              </p>
              <RadioGroup
                value={form.card_payment_date}
                onValueChange={(v) => update("card_payment_date", v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comanda_date" id="card_comanda" />
                  <Label htmlFor="card_comanda" className="cursor-pointer">Data da comanda</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="receive_date" id="card_receive" />
                  <Label htmlFor="card_receive" className="cursor-pointer">Data que o estabelecimento recebe</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== SEÇÃO 2: DESCONTOS ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Descontos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            É possível dividir alguns <strong>custos</strong> do seu espaço com os <strong>profissionais</strong>, sabia dessa? Defina quais serão os <strong>descontos nas comissões</strong>:
            <br />
            <span className="text-xs">Lembre-se que as taxas são descontadas de acordo com a % de comissão de cada profissional.</span>
          </p>

          {/* Taxa de Antecipação */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="font-semibold">Taxa de Antecipação</Label>
            </div>
            <RadioGroup
              value={form.anticipation_fee_enabled ? "yes" : "no"}
              onValueChange={(v) => update("anticipation_fee_enabled", v === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="antic_no" />
                <Label htmlFor="antic_no" className="cursor-pointer">Não descontar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="antic_yes" />
                <Label htmlFor="antic_yes" className="cursor-pointer">Descontar</Label>
              </div>
            </RadioGroup>
            {form.anticipation_fee_enabled && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm">Escolha o valor da <strong>taxa de antecipação</strong>:</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.anticipation_fee_percent}
                  onChange={(e) => update("anticipation_fee_percent", parseFloat(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>

          {/* Taxa de Cartão */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <Label className="font-semibold">Taxa de Cartão</Label>
            <RadioGroup
              value={form.card_fee_mode}
              onValueChange={(v) => update("card_fee_mode", v)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="card_none" />
                <Label htmlFor="card_none" className="cursor-pointer">Não descontar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card_brands" id="card_brands" />
                <Label htmlFor="card_brands" className="cursor-pointer">
                  Descontar as mesmas{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => navigate("/configuracoes/financeiro")}
                  >
                    taxas da máquina de cartão
                  </button>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="card_custom" />
                <Label htmlFor="card_custom" className="cursor-pointer">Descontar outras taxas</Label>
              </div>
            </RadioGroup>
            {form.card_fee_mode === "custom" && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm">Valor da taxa personalizada:</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.custom_card_fee_percent}
                  onChange={(e) => update("custom_card_fee_percent", parseFloat(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>

          {/* Taxa de Administração */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <Label className="font-semibold">Taxa de Administração do estabelecimento</Label>
            <RadioGroup
              value={form.admin_fee_enabled ? "yes" : "no"}
              onValueChange={(v) => update("admin_fee_enabled", v === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="admin_no" />
                <Label htmlFor="admin_no" className="cursor-pointer">Não descontar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="admin_yes" />
                <Label htmlFor="admin_yes" className="cursor-pointer">Descontar</Label>
              </div>
            </RadioGroup>
            {form.admin_fee_enabled && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Escolha o valor da <strong>taxa de administração</strong>:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.admin_fee_percent}
                    onChange={(e) => update("admin_fee_percent", parseFloat(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>

                <Separator />

                <div>
                  <Label className="font-semibold text-sm">Taxa de administração da prestação de serviço:</Label>
                  <RadioGroup
                    value={form.admin_fee_scope}
                    onValueChange={(v) => update("admin_fee_scope", v)}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all_items" id="admin_all" />
                      <Label htmlFor="admin_all" className="cursor-pointer">Descontar de todos os itens da comanda</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="services_only" id="admin_services" />
                      <Label htmlFor="admin_services" className="cursor-pointer">Descontar apenas dos serviços feitos</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </div>

          {/* Taxa de Custo dos Serviços */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <Label className="font-semibold">Taxa de custo dos serviços</Label>
            <RadioGroup
              value={form.service_cost_enabled ? "yes" : "no"}
              onValueChange={(v) => update("service_cost_enabled", v === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="svcost_no" />
                <Label htmlFor="svcost_no" className="cursor-pointer">Não descontar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="svcost_yes" />
                <Label htmlFor="svcost_yes" className="cursor-pointer">Descontar</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Taxa de Produto */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <Label className="font-semibold">Taxa de Produto</Label>
            <RadioGroup
              value={form.product_cost_deduction}
              onValueChange={(v) => update("product_cost_deduction", v)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before_commission" id="prod_before" />
                <Label htmlFor="prod_before" className="cursor-pointer">Descontar antes de calcular a comissão</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_commission" id="prod_after" />
                <Label htmlFor="prod_after" className="cursor-pointer">Descontar depois de calcular a comissão</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custo de Produto Vendido */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <Label className="font-semibold">Custo de produto vendido (shampoo, condicionador etc.)</Label>
            <p className="text-xs text-muted-foreground">
              Quando o profissional vende um produto diretamente, a comissão pode ou não descontar o custo de compra do produto. Isso vale só para itens vendidos, não para produtos consumidos em serviço (tinta, química etc.).
            </p>
            <RadioGroup
              value={form.product_sale_deduct_cost ? "yes" : "no"}
              onValueChange={(v) => update("product_sale_deduct_cost", v === "yes")}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="prodsale_yes" />
                <Label htmlFor="prodsale_yes" className="cursor-pointer">Descontar custo do produto antes da comissão (padrão)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="prodsale_no" />
                <Label htmlFor="prodsale_no" className="cursor-pointer">Não descontar custo — comissão aplicada sobre o valor de venda (menos taxa de cartão)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* ===== SEÇÃO 3: RECIBO DE COMISSÃO ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recibo de Comissão</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            O sigilo é importante, a transparência também. Defina quais <strong>informações você e seus profissionais</strong> terão acesso no <strong>recibo de comissão</strong>:
          </p>

          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            {/* Valores de faturamento */}
            <div>
              <Label className="font-semibold text-sm">Valores de faturamento na aba de comissões</Label>
              <RadioGroup
                value={form.show_revenue_values ? "show" : "hide"}
                onValueChange={(v) => update("show_revenue_values", v === "show")}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="rev_hide" />
                  <Label htmlFor="rev_hide" className="cursor-pointer">Ocultar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="show" id="rev_show" />
                  <Label htmlFor="rev_show" className="cursor-pointer">Não ocultar</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Custos e valores cobrados */}
            <div>
              <Label className="font-semibold text-sm">Custos e valores cobrados</Label>
              <RadioGroup
                value={form.show_costs_values ? "show" : "hide"}
                onValueChange={(v) => update("show_costs_values", v === "show")}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="cost_hide" />
                  <Label htmlFor="cost_hide" className="cursor-pointer">Ocultar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="show" id="cost_show" />
                  <Label htmlFor="cost_show" className="cursor-pointer">Não ocultar</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Taxas de administração */}
            <div>
              <Label className="font-semibold text-sm">Descontos das taxas de administração de forma:</Label>
              <RadioGroup
                value={form.admin_fee_display}
                onValueChange={(v) => update("admin_fee_display", v)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="admdisp_detail" />
                  <Label htmlFor="admdisp_detail" className="cursor-pointer">Detalhada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summary" id="admdisp_summary" />
                  <Label htmlFor="admdisp_summary" className="cursor-pointer">Resumida</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Taxas de cartão */}
            <div>
              <Label className="font-semibold text-sm">Descontos das taxas de cartão de forma:</Label>
              <RadioGroup
                value={form.card_fee_display}
                onValueChange={(v) => update("card_fee_display", v)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="carddisp_detail" />
                  <Label htmlFor="carddisp_detail" className="cursor-pointer">Detalhada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summary" id="carddisp_summary" />
                  <Label htmlFor="carddisp_summary" className="cursor-pointer">Resumida</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Taxas de serviço */}
            <div>
              <Label className="font-semibold text-sm">Descontos das taxas de serviço de forma:</Label>
              <RadioGroup
                value={form.service_fee_display}
                onValueChange={(v) => update("service_fee_display", v)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="svcdisp_detail" />
                  <Label htmlFor="svcdisp_detail" className="cursor-pointer">Detalhada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summary" id="svcdisp_summary" />
                  <Label htmlFor="svcdisp_summary" className="cursor-pointer">Resumida</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== SEÇÃO 4: COMISSÃO AVANÇADA ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Comissão Avançada</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Quando o assunto é <strong>comissão</strong>, um mundo de oportunidades se abre. Defina as <strong>condições especiais</strong> das comissões de quem ajuda seu estabelecimento ser um sucesso:
          </p>

          <div className="bg-muted/30 rounded-lg p-4 space-y-6">
            {/* Pré-venda */}
            <div className="space-y-3">
              <Label className="font-semibold text-sm">Escolha a regra de comissão para pré-venda de serviço:</Label>
              <RadioGroup
                value={form.presale_commission_rule}
                onValueChange={(v) => update("presale_commission_rule", v)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="discounted_value" id="presale_disc" />
                  <Label htmlFor="presale_disc" className="cursor-pointer">Considerar valor com desconto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="service_value" id="presale_svc" />
                  <Label htmlFor="presale_svc" className="cursor-pointer">Considerar valor do serviço</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="presale_none" />
                  <Label htmlFor="presale_none" className="cursor-pointer">Não considerar</Label>
                </div>
              </RadioGroup>
              {form.presale_commission_rule !== "none" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.presale_commission_percent}
                    onChange={(e) => update("presale_commission_percent", parseFloat(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Vale-presente */}
            <div className="space-y-3">
              <Label className="font-semibold text-sm">Escolha a porcentagem da comissão para venda de vale-presente:</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.gift_card_commission_percent}
                  onChange={(e) => update("gift_card_commission_percent", parseFloat(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <Separator />

            {/* Pacotes */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="font-semibold text-sm">Ativar comissão específica sobre venda de pacotes:</Label>
                <Switch
                  checked={form.package_commission_enabled}
                  onCheckedChange={(v) => update("package_commission_enabled", v)}
                />
              </div>
              {form.package_commission_enabled && (
                <div className="space-y-2">
                  <Label className="text-sm">Escolha a porcentagem da comissão para venda de <strong>pacote</strong>:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.package_commission_percent}
                      onChange={(e) => update("package_commission_percent", parseFloat(e.target.value) || 0)}
                      className="w-24 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Dois assistentes */}
            <div className="space-y-3">
              <Label className="font-semibold text-sm">Escolha o desconto da comissão quando dois assistentes trabalharem no mesmo serviço:</Label>
              <RadioGroup
                value={form.dual_assistant_rule}
                onValueChange={(v) => update("dual_assistant_rule", v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_value" id="dual_full" />
                  <Label htmlFor="dual_full" className="cursor-pointer">Sobre o valor total do serviço</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="half_value" id="dual_half" />
                  <Label htmlFor="dual_half" className="cursor-pointer">Metade do valor do serviço</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Mensagem do rodapé */}
            <div className="space-y-3">
              <Label className="font-semibold text-sm">Personalize a mensagem de rodapé do recibo de comissão:</Label>
              <Textarea
                value={form.receipt_footer_message}
                onChange={(e) => update("receipt_footer_message", e.target.value)}
                placeholder="Eu, {nomeProf} documento: {documentoProf}, declaro ter recebido da empresa {nomeUnidade} documento: {documentoUnidade}, o Total a Receber conforme indicado acima. E por ser verdade afirmo e assino abaixo:"
                maxLength={255}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Utilize as marcações para substituir pela informação cadastrada: {"{nomeProf}"} nome do profissional, {"{cpfProf}"} CPF do profissional, {"{documentoProf}"} documento do profissional, {"{nomeUnidade}"} nome da unidade, {"{documentoUnidade}"} documento da unidade.
              </p>
              <p className="text-xs text-muted-foreground text-right">
                {form.receipt_footer_message.length}/255
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
