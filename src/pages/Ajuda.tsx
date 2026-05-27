// @ts-nocheck
import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Calendar,
  ShoppingCart,
  DollarSign,
  Users,
  UserCog,
  Scissors,
  Package,
  Percent,
  Activity,
  FileText,
  Settings,
  HelpCircle,
  Home,
  Webhook,
  Globe,
  Mail,
  Receipt,
  Box,
  Banknote,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  icon: any;
  content: () => JSX.Element;
};

function P({ children }: { children: any }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}
function H({ children }: { children: any }) {
  return <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>;
}
function H2({ children }: { children: any }) {
  return <h2 className="text-xl font-bold mt-2 mb-4">{children}</h2>;
}
function Step({ n, children }: { n: number; children: any }) {
  return (
    <div className="flex gap-3 items-start py-2">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
function Tip({ children }: { children: any }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 px-3 py-2 my-3 text-sm rounded-r">
      💡 {children}
    </div>
  );
}
function Warn({ children }: { children: any }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 px-3 py-2 my-3 text-sm rounded-r">
      ⚠️ {children}
    </div>
  );
}
function K({ children }: { children: any }) {
  return <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{children}</code>;
}

const sections: Section[] = [
  {
    id: "overview",
    title: "Visão geral",
    icon: Home,
    content: () => (
      <>
        <H2>Visão geral do sistema</H2>
        <P>
          Este é o sistema de gestão completo do seu salão. Ele cuida do dia-a-dia
          (agenda, atendimento, caixa) e também das partes administrativas
          (estoque, contas a pagar, comissões, relatórios).
        </P>
        <H>Módulos principais</H>
        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
          <li><strong>Agenda</strong> — cabine pra ver e marcar horários por profissional</li>
          <li><strong>Comandas</strong> — abre conta do cliente quando ele chega, fecha quando paga</li>
          <li><strong>Caixa</strong> — abertura/fechamento diário com sangria, suprimento e relatório</li>
          <li><strong>Clientes</strong> — cadastro completo, histórico, fidelidade, dívidas, créditos</li>
          <li><strong>Profissionais</strong> — quem atende ou vende, com comissão e agenda própria</li>
          <li><strong>Serviços e Produtos</strong> — o que você vende, com preços e estoque</li>
          <li><strong>Financeiro</strong> — contas a pagar, transações, comissões, relatórios</li>
          <li><strong>Configurações</strong> — usuários, integrações, e-mails, Meta Ads</li>
        </ul>
        <H>Fluxo típico de um atendimento</H>
        <Step n={1}>Cliente liga ou chega → recepcionista busca o cadastro dele em <K>Clientes</K> (ou cria novo)</Step>
        <Step n={2}>Marca horário em <K>Agenda</K> com o profissional desejado</Step>
        <Step n={3}>Quando o cliente chega, clica no agendamento → <strong>Abrir Comanda</strong></Step>
        <Step n={4}>Adiciona serviços e produtos vendidos na comanda</Step>
        <Step n={5}>No final, recebe o pagamento (Pix, dinheiro, cartão) e <strong>Fecha</strong> a comanda</Step>
        <Step n={6}>O sistema calcula comissão automática, baixa estoque e registra no caixa</Step>
        <Tip>
          O sistema funciona por <strong>salão</strong>: cada salão tem suas próprias agendas,
          clientes, profissionais. Master e administradores podem acessar tudo, recepcionistas
          e profissionais têm visão restrita.
        </Tip>
      </>
    ),
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: Calendar,
    content: () => (
      <>
        <H2>Agenda</H2>
        <P>
          A agenda mostra horários disponíveis por profissional em colunas. Cada
          profissional tem o próprio horário de trabalho cadastrado.
        </P>
        <H>Como marcar um horário</H>
        <Step n={1}>Escolha a data clicando no calendário do topo (ou setas pra navegar dia a dia)</Step>
        <Step n={2}>Localize a coluna do profissional desejado</Step>
        <Step n={3}>Clique no slot do horário (linha do horário × coluna do profissional)</Step>
        <Step n={4}>Preencha cliente, serviço, duração — clique <strong>Salvar</strong></Step>
        <H>Quem aparece na agenda?</H>
        <P>
          Apenas profissionais marcados com <strong>"Possuo agenda"</strong> ativo aparecem
          como coluna. Recepcionista/vendedora que recebe comissão mas não atende cliente
          é cadastrada com essa opção desmarcada — ela continua aparecendo em Comandas e
          Comissões, mas não polui a agenda.
        </P>
        <Tip>
          Configure <K>has_schedule</K> no cadastro do profissional (Profissionais → editar
          → checkbox "Possuo agenda").
        </Tip>
        <H>Bloquear horário</H>
        <Step n={1}>Botão <strong>Bloquear horário</strong> no topo da agenda</Step>
        <Step n={2}>Escolha profissional + data/hora + duração + motivo</Step>
        <Step n={3}>O slot fica vermelho com 🔒 e ninguém consegue marcar agendamento ali</Step>
        <H>Editar ou remarcar</H>
        <Step n={1}>Clique no agendamento existente</Step>
        <Step n={2}>Use <strong>Remarcar</strong> pra mudar data/hora/profissional (cliente é avisado por e-mail se tiver e-mail cadastrado)</Step>
        <Step n={3}>Ou <strong>Editar</strong> pra ajustar serviço, observações, preço</Step>
        <H>Status dos agendamentos</H>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li><Badge variant="outline">Agendado</Badge> — recém-criado, ainda não chegou</li>
          <li><Badge variant="outline" className="bg-amber-100">Confirmado</Badge> — cliente confirmou via WA/e-mail</li>
          <li><Badge variant="outline" className="bg-green-100">Concluído</Badge> — comanda fechada</li>
          <li><Badge variant="outline" className="bg-red-100">Cancelado</Badge> — cancelado por algum motivo</li>
        </ul>
        <H>Visualizações</H>
        <P>Selecione 3, 5, 8, 10, 12, 15, 20, 25 colunas ou "Todos" no canto superior direito da agenda. Em mobile, swipe horizontal pra ver mais.</P>
      </>
    ),
  },
  {
    id: "comandas",
    title: "Comandas",
    icon: ShoppingCart,
    content: () => (
      <>
        <H2>Comandas</H2>
        <P>
          A comanda é a "conta" do cliente durante o atendimento. Você abre quando ele
          chega, adiciona o que ele consumiu e fecha quando ele paga.
        </P>
        <H>Abrir comanda</H>
        <P>2 formas:</P>
        <Step n={1}><strong>Pela agenda:</strong> clique no agendamento → "Abrir comanda" (puxa o profissional e o cliente automático)</Step>
        <Step n={2}><strong>Direto:</strong> menu Comandas → Nova Comanda → escolhe profissional + cliente</Step>
        <H>Adicionar itens</H>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li><strong>Serviço</strong> — atendimento prestado</li>
          <li><strong>Produto</strong> — venda de item do estoque (baixa o saldo automaticamente)</li>
          <li><strong>Kit</strong> — combo de produtos com desconto único</li>
          <li><strong>Pacote</strong> — sessões pré-pagas (cliente comprou 10 escovas, vai usando)</li>
        </ul>
        <H>Cliente com dívida ou crédito</H>
        <P>
          Se o cliente já tem <strong>dívida anterior</strong>, aparece um alerta no topo da
          comanda. Você pode cobrar a dívida nessa mesma comanda (checkbox "Quitar dívida").
        </P>
        <P>
          Se tem <strong>crédito</strong> (porque cancelou uma compra antes), também aparece —
          dá pra abater do total da comanda atual.
        </P>
        <H>Cashback</H>
        <P>
          Quando o cliente paga, parte do valor vira cashback automaticamente (se o programa
          estiver ativo em Configurações). O cashback fica disponível pra usar em comandas
          futuras, com validade.
        </P>
        <H>Fechar comanda</H>
        <Step n={1}>Confira itens, valor total, desconto e bônus</Step>
        <Step n={2}>Adicione os pagamentos (várias formas misturadas: parte Pix, parte cartão)</Step>
        <Step n={3}>Clique <strong>Fechar</strong> — o sistema baixa estoque, calcula comissão, registra no caixa, envia evento Meta Purchase</Step>
        <Warn>
          A comanda só fecha se o <strong>caixa do dia estiver aberto</strong>. Se o caixa
          de ontem ficou aberto, abre primeiro o de hoje.
        </Warn>
        <H>Comissão por item</H>
        <P>
          Cada item da comanda tem uma % de comissão calculada automática (vinda do produto/serviço
          ou da configuração geral do profissional). Você pode <strong>sobrescrever</strong> manualmente
          a % de um item específico — clique no item, ajuste a %.
        </P>
        <H>Reabrir comanda</H>
        <P>
          Errou algo? Comandas fechadas podem ser reabertas (se o caixa ainda estiver aberto).
          O sistema reverte estoque, comissão e cashback. Edite e feche de novo.
        </P>
      </>
    ),
  },
  {
    id: "caixa",
    title: "Caixa",
    icon: DollarSign,
    content: () => (
      <>
        <H2>Caixa</H2>
        <P>
          O caixa é o controle financeiro do dia. Você abre de manhã, fecha à noite com
          conferência. Comandas só podem ser fechadas se o caixa do dia estiver aberto.
        </P>
        <H>Abrir caixa</H>
        <Step n={1}>Menu Caixa → Abrir Caixa</Step>
        <Step n={2}>Informe o valor inicial em dinheiro (troco que ficou na gaveta)</Step>
        <Step n={3}>Caixa fica "aberto" e aceita comandas</Step>
        <H>Sangria e suprimento</H>
        <P>
          <strong>Sangria</strong>: tira dinheiro do caixa (ex: leva pro banco, paga conta). Sai do saldo do caixa.
        </P>
        <P>
          <strong>Suprimento</strong>: coloca dinheiro no caixa (ex: troco extra). Entra no saldo.
        </P>
        <H>Fechar caixa</H>
        <Step n={1}>Conta o dinheiro físico que sobrou</Step>
        <Step n={2}>Sistema mostra o esperado (inicial + entradas - sangrias)</Step>
        <Step n={3}>Se sobrar ou faltar, registra a diferença</Step>
        <Step n={4}>Fecha → relatório do dia é gerado</Step>
        <Warn>
          Se você tentar abrir uma comanda nova com o caixa do dia anterior em aberto, o sistema
          bloqueia. Feche o caixa anterior primeiro.
        </Warn>
      </>
    ),
  },
  {
    id: "clientes",
    title: "Clientes",
    icon: Users,
    content: () => (
      <>
        <H2>Clientes</H2>
        <P>
          Cadastro central de quem frequenta o salão. Cada cliente tem histórico de atendimentos,
          comandas, fidelidade, cashback, dívidas e créditos.
        </P>
        <H>Cadastrar cliente novo</H>
        <Step n={1}>Menu Clientes → Novo Cliente</Step>
        <Step n={2}>Obrigatório: nome, telefone, e-mail (e-mail é usado em notificações)</Step>
        <Step n={3}>Recomendado: CPF (melhora atribuição de campanhas Meta) e data de nascimento (programa de aniversário)</Step>
        <Step n={4}>Adicionar endereço, observações e tags conforme necessidade</Step>
        <Tip>
          O nome é gravado sempre em <strong>MAIÚSCULAS</strong> automaticamente pra padronização.
        </Tip>
        <H>Unir cadastros duplicados</H>
        <P>
          Cliente cadastrado 2x? Selecione os cadastros e use <strong>Unir Cadastros</strong>
          (botão no menu). O sistema combina histórico, agendamentos, comandas, fidelidade e
          mantém o cadastro mais antigo como principal.
        </P>
        <H>Avisos da cliente</H>
        <P>
          A página <strong>Clientes → Avisos</strong> lista clientes que precisam de atenção:
        </P>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>Aniversariantes do dia/semana</li>
          <li>Cashback expirando</li>
          <li>Sem retorno há muito tempo</li>
          <li>Dívida em aberto</li>
        </ul>
        <H>Fidelidade</H>
        <P>
          Programa de cashback automático: a cada compra, % do valor vira saldo pra próximas compras.
          Configure em Configurações → Comissões → Fidelidade: % de cashback, validade, valor mínimo
          pra acumular.
        </P>
        <H>Dívida e crédito</H>
        <P>
          Cliente que saiu sem pagar fica com <strong>dívida</strong> no histórico — aparece como alerta
          em qualquer comanda futura dela.
        </P>
        <P>
          Cliente que pagou e cancelou serviço fica com <strong>crédito</strong> — pode ser usado em
          comandas futuras.
        </P>
      </>
    ),
  },
  {
    id: "profissionais",
    title: "Profissionais",
    icon: UserCog,
    content: () => (
      <>
        <H2>Profissionais</H2>
        <P>
          Quem atende cliente (cabeleireira, manicure) ou vende produto (recepcionista, vendedora).
          Cada um tem comissão e configurações próprias.
        </P>
        <H>Cadastrar profissional</H>
        <Step n={1}>Menu Profissionais → Novo Profissional</Step>
        <Step n={2}>Dados básicos: nome, apelido, especialidade, telefone, e-mail</Step>
        <Step n={3}>Comissão (%) — porcentagem padrão sobre vendas</Step>
        <Step n={4}>Marcar <strong>"Possuo agenda"</strong> se ela atende cliente (aparece como coluna na agenda)</Step>
        <Step n={5}>Salvar — pode opcionalmente criar acesso pro sistema (login/senha)</Step>
        <H>Recepcionista que VENDE produto</H>
        <P>
          Caso especial: vendedora que recebe comissão mas não atende cliente.
        </P>
        <Step n={1}>Cadastra como profissional normalmente</Step>
        <Step n={2}>Define a comissão (%) — vai receber sobre tudo que vender</Step>
        <Step n={3}>Desmarca <strong>"Possuo agenda"</strong></Step>
        <Step n={4}>Pronto — não aparece na agenda mas aparece em Comandas e Comissões</Step>
        <H>Comissões — hierarquia de cálculo</H>
        <P>O sistema decide qual % usar nessa ordem:</P>
        <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
          <li>Sobrescrita manual no item da comanda (<K>commission_percent_override</K>)</li>
          <li>% específica do produto/serviço (<K>commission_percent</K> no cadastro)</li>
          <li>% geral do profissional (<K>commission_percent</K> dela)</li>
        </ol>
        <Tip>
          Configure a comissão no <strong>produto</strong> quando a regra for "todo X paga Y%
          pra quem vender". Configure no <strong>profissional</strong> quando for "essa pessoa
          ganha Y% em tudo que vender".
        </Tip>
        <H>Horário de trabalho</H>
        <P>
          Cada profissional tem horários de atendimento por dia da semana (segunda 9h-18h,
          sábado 8h-14h, etc). Configure no cadastro dela. A agenda só permite marcar nos
          horários definidos.
        </P>
        <H>Acesso ao sistema</H>
        <P>
          Profissionais podem ter login próprio (ver agenda só dela, fechar caixa, etc).
          O master/admin define o <strong>nível de acesso</strong> de cada um em Configurações →
          Grupos de Acessos.
        </P>
        <Warn>
          Se o profissional sair do salão, marque como <strong>inativo</strong> (não deletar) —
          assim o histórico de comandas e comissões antigas continua íntegro.
        </Warn>
      </>
    ),
  },
  {
    id: "servicos",
    title: "Serviços",
    icon: Scissors,
    content: () => (
      <>
        <H2>Serviços</H2>
        <P>
          O que o salão oferece: corte, mecha, escova, hidratação, manicure, etc. Cada serviço
          tem preço, duração padrão e comissão própria.
        </P>
        <H>Cadastrar serviço</H>
        <Step n={1}>Menu Serviços → Novo Serviço</Step>
        <Step n={2}>Nome, preço, duração (em minutos)</Step>
        <Step n={3}>Comissão (%) padrão sobre esse serviço</Step>
        <Step n={4}>Categoria (cor, química, manicure, etc) — facilita relatórios</Step>
        <Step n={5}>Marcar <strong>Disponibilizar para agendamento online</strong> se quiser que cliente possa marcar sozinha pelo portal</Step>
        <H>Comissão por profissional</H>
        <P>
          Em alguns casos a comissão de um serviço varia por profissional (júnior ganha 30%,
          sênior ganha 50%). Configure isso em <K>professional_service_commissions</K> —
          edite o profissional e na aba "Comissões por serviço" defina valores específicos.
        </P>
        <H>Disponibilidade na agenda online</H>
        <P>
          Marque a opção <strong>"Disponibilizar para agendamento online"</strong> apenas em
          serviços simples (corte, escova). Mecha, química e procedimentos complexos pedem
          avaliação prévia — mantém esses como agendamento só pela recepção.
        </P>
      </>
    ),
  },
  {
    id: "produtos",
    title: "Produtos e Kits",
    icon: Package,
    content: () => (
      <>
        <H2>Produtos e Kits</H2>
        <P>
          Produtos pra venda no salão (shampoo, condicionador, ampolas) e kits (combos com desconto).
          O sistema controla estoque automaticamente — toda venda baixa, toda compra (NFe) entra.
        </P>
        <H>Cadastrar produto</H>
        <Step n={1}>Menu Estoque → Produtos → Novo Produto</Step>
        <Step n={2}>Nome, código de barras (opcional), categoria, marca, fornecedor</Step>
        <Step n={3}>Preço de venda, custo, comissão (%)</Step>
        <Step n={4}>Estoque inicial (caixa "É para revenda?" — uso interno baixa estoque mas não tem comissão)</Step>
        <H>Kits de produtos</H>
        <P>
          Kit é um combo: vende 3 produtos por 1 preço com desconto. Estoque baixa nos SKUs
          individuais; comissão é rateada proporcional usando o % de cada produto.
        </P>
        <Step n={1}>Menu Estoque → Kits de Produtos → Novo Kit</Step>
        <Step n={2}>Nome do kit (ex: "Kit Tratamento Color Shield")</Step>
        <Step n={3}>% de desconto global sobre soma dos preços individuais</Step>
        <Step n={4}>Adicione os produtos que compõem o kit (com quantidade de cada)</Step>
        <Step n={5}>Salvar — kit fica disponível no popover "Kit" da comanda</Step>
        <Tip>
          Na comanda, escolha <strong>Adicionar Kit</strong> em vez de adicionar produtos um a um.
          O sistema cria uma linha do kit + as linhas dos produtos individuais (pra baixar estoque
          de cada SKU).
        </Tip>
        <H>Movimentações de estoque</H>
        <P>
          Toda venda baixa estoque. Toda compra (entrada NFe) ou ajuste manual é registrado em
          <strong> stock_movements</strong>. Você consulta o histórico de cada produto em
          Estoque → Produtos → editar produto → aba "Movimentações".
        </P>
        <H>Importação de NF</H>
        <P>
          Pra cadastrar compra de fornecedor (Keune, Truss, etc), use os scripts de importação
          em <K>scripts/keune_import/</K> e similares — eles leem o XML da NFe, criam produtos
          se não existirem, lançam entrada de estoque e contas a pagar automaticamente.
        </P>
      </>
    ),
  },
  {
    id: "contas-pagar",
    title: "Contas a Pagar",
    icon: Receipt,
    content: () => (
      <>
        <H2>Contas a Pagar</H2>
        <P>
          Lista de boletos e despesas que o salão tem que pagar (fornecedor de produto, aluguel,
          contador, energia, etc). Sistema agenda alertas e marca como pago.
        </P>
        <H>Cadastrar conta</H>
        <Step n={1}>Menu Financeiro → Contas a Pagar → Nova Conta</Step>
        <Step n={2}>Descrição, fornecedor, valor, vencimento</Step>
        <Step n={3}>Categoria financeira (Custos com produto, aluguel, impostos, etc)</Step>
        <Step n={4}>Anexar boleto ou nota se quiser</Step>
        <H>Marcar como pago</H>
        <Step n={1}>Clica no botão "Pagar" da linha</Step>
        <Step n={2}>Informa data do pagamento e forma (Pix, dinheiro, cartão, transferência)</Step>
        <Step n={3}>Sistema gera transação financeira automaticamente</Step>
        <H>Widget Dashboard</H>
        <P>
          Próximas contas a vencer aparecem como widget no Dashboard inicial. Conta vencida fica
          em vermelho.
        </P>
        <Tip>
          Importação automática: ao importar NFe de fornecedor pelo script Keune/Truss, os boletos
          já entram aqui sem digitar manualmente.
        </Tip>
      </>
    ),
  },
  {
    id: "comissoes",
    title: "Comissões",
    icon: Percent,
    content: () => (
      <>
        <H2>Comissões</H2>
        <P>
          Apuração automática do quanto cada profissional ganha. Calcula com base nas comandas
          fechadas no período.
        </P>
        <H>Como gerar relatório</H>
        <Step n={1}>Menu Comissões (ou Financeiro → Comissões)</Step>
        <Step n={2}>Escolher profissional + período (semana, quinzena, mês)</Step>
        <Step n={3}>Sistema lista cada item de comanda atendido por ela com a % e o valor da comissão</Step>
        <H>Ajustes manuais</H>
        <P>
          Pode adicionar <strong>bônus</strong> (premiação extra) ou <strong>desconto</strong>
          (vale-adiantado, falta) na apuração antes de fechar.
        </P>
        <H>Profissional vs Master</H>
        <P>
          Master vê comissões de todos. Profissional só vê as próprias. Configurações de
          quem vê o quê estão em Grupos de Acessos.
        </P>
        <H>Configurações de fidelidade e cashback</H>
        <P>
          Em Configurações → Comissões você define também:
        </P>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>% de cashback do programa de fidelidade</li>
          <li>Validade do cashback</li>
          <li>Compra mínima pra acumular</li>
          <li>Cashback ativo por padrão (sim/não)</li>
          <li>Toggle "não descontar custo do produto na comissão" (v6)</li>
        </ul>
      </>
    ),
  },
  {
    id: "integracao-meta",
    title: "Integração Meta Ads",
    icon: Activity,
    content: () => (
      <>
        <H2>Integração Meta Ads (Conversions API)</H2>
        <P>
          A cada comanda fechada, o sistema envia evento Purchase pro Meta (Facebook/Instagram)
          via API — fecha o loop de ROI das suas campanhas de anúncio.
        </P>
        <H>Por que importa</H>
        <P>
          Cliente clica no anúncio Meta → vira lead no WhatsApp → atendida no salão dias depois.
          Sem CAPI, o Meta nunca sabe que a campanha gerou venda. Com CAPI, cada comanda fechada
          alimenta o algoritmo de bidding pra otimizar as campanhas certas.
        </P>
        <H>Como ativar</H>
        <Step n={1}>Menu Configurações → Integração Meta Ads</Step>
        <Step n={2}>Cola Pixel ID (do Meta Events Manager)</Step>
        <Step n={3}>Cola CAPI Access Token (System User Token de longa duração)</Step>
        <Step n={4}>Liga o toggle "Integração ativa" → Salvar</Step>
        <Step n={5}>Pra testar sem afetar produção: cola um Test Event Code (Meta Events Manager → Test Events) e clica "Testar envio"</Step>
        <Step n={6}>Confirma que apareceu na aba Test Events → apaga o Test Event Code → vira produção real</Step>
        <H>Quando dispara</H>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li><strong>InitiateCheckout</strong> quando comanda é aberta com cliente vinculado</li>
          <li><strong>Purchase</strong> quando comanda é fechada (<K>closed_at</K> preenchido)</li>
        </ul>
        <H>Dados enviados</H>
        <P>
          Tudo hasheado SHA256 (padrão Meta): telefone, e-mail, nome, sobrenome, gênero, data
          nascimento, cidade, estado, CEP, país. CPF é usado como <K>external_id</K> (chave
          mais discriminativa pra atribuição). Valor da comanda em BRL bruto. UUID dos itens
          como <K>content_ids</K>.
        </P>
        <H>Auditoria</H>
        <P>
          A própria tela mostra os últimos 20 eventos enviados com status HTTP, fbtrace_id da
          resposta Meta, valor e timestamp. Se falhar, aparece em vermelho com a mensagem do erro.
        </P>
      </>
    ),
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: FileText,
    content: () => (
      <>
        <H2>Relatórios</H2>
        <P>
          Dashboards e exportações pra entender vendas, comissões, fluxo de caixa e desempenho
          por profissional/serviço/produto.
        </P>
        <H>Relatórios disponíveis</H>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li><strong>Faturamento</strong> — vendas por dia/semana/mês</li>
          <li><strong>Por profissional</strong> — quem mais vendeu</li>
          <li><strong>Por serviço/produto</strong> — o que mais sai</li>
          <li><strong>Comissões</strong> — quanto cada um ganhou</li>
          <li><strong>Fluxo de caixa</strong> — entradas vs saídas</li>
          <li><strong>Aniversariantes</strong> — quem aniversaria no período</li>
          <li><strong>Clientes inativos</strong> — sem retornar há X dias</li>
        </ul>
        <H>Exportação</H>
        <P>Todo relatório tem botão de exportar Excel/CSV pra trabalhar fora do sistema (planilha do contador, análise extra).</P>
      </>
    ),
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    content: () => (
      <>
        <H2>Configurações</H2>
        <P>Ajustes do estabelecimento, integrações e permissões.</P>
        <H>Estabelecimento</H>
        <P>Nome do salão, endereço, telefone, logo, horário de funcionamento padrão.</P>
        <H>Agendamento</H>
        <P>Intervalo dos slots (30min, 15min), tempo mínimo pra confirmar/cancelar, janela de antecedência máxima.</P>
        <H>Comissões e Fidelidade</H>
        <P>% de cashback, validade, mínimo de compra, ativação por padrão, regras gerais.</P>
        <H>Financeiro</H>
        <P>Categorias de despesa/receita, contas bancárias, bandeiras de cartão e taxas (incluindo Pix e parcelamento), modelo de pre-sale.</P>
        <H>Grupos de Acessos</H>
        <P>Define o que cada nível (master, admin, manager, recepcionista, profissional, financeiro) pode ver e fazer. Você cria níveis customizados também.</P>
        <H>Webhook / Agente IA</H>
        <P>Endpoint pra agente WA (Maia/Vivi/Helena/Sâmia) consumir o sistema: criar agendamento, buscar cliente, etc.</P>
        <H>API REST</H>
        <P>Endpoints pra integrações externas (ERP, app mobile, dashboard externo).</P>
        <H>E-mails Automáticos</H>
        <P>Configura o Resend (provedor de e-mail) pra disparar confirmações, lembretes, aniversários e cashback expirando.</P>
        <H>Integração Meta Ads</H>
        <P>Conversions API server-side. Ver seção dedicada nesse manual.</P>
        <H>Auditoria</H>
        <P>Master vê histórico de exclusões e alterações críticas (quem apagou comanda, quem mudou comissão, etc).</P>
        <H>Atualizações do Sistema</H>
        <P>Aplica migrações pendentes do banco quando o time de desenvolvimento sobe nova versão.</P>
      </>
    ),
  },
];

export default function Ajuda() {
  const [active, setActive] = useState("overview");
  const [search, setSearch] = useState("");

  const filteredSections = sections.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  const ActiveContent = sections.find((s) => s.id === active)?.content;

  return (
    <AppLayoutNew>
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Central de Ajuda</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manual completo do sistema. Use o menu lateral pra navegar ou busque por tópico.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <Card className="h-fit sticky top-20">
            <CardContent className="p-3 space-y-1">
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tópico..."
                  className="pl-8 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {filteredSections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                      active === s.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              {ActiveContent && <ActiveContent />}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayoutNew>
  );
}
