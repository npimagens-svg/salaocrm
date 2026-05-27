// @ts-nocheck
import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, Check, MessageCircle, ExternalLink, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Links() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = `${origin}/cliente`;
  const portalAgendarUrl = `${origin}/cliente/agendar`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(portalUrl)}&margin=10`;

  const waMessage = encodeURIComponent(
    `Olá! Para marcar seu horário sozinha pelo celular acesse: ${portalUrl}`,
  );
  const waLink = `https://wa.me/?text=${waMessage}`;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Link copiado" });
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Links compartilháveis</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Use esses links pra divulgar o auto-agendamento. Cliente acessa pelo celular,
          cria conta com telefone+senha e marca horário sozinha.
        </p>

        {/* Portal Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Portal da Cliente (Agendamento Online)
            </CardTitle>
            <CardDescription>
              Cole esse link no perfil do Instagram, no status do WhatsApp, em campanhas
              ou imprima o QR code pra deixar na recepção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <img
                src={qrSrc}
                alt="QR Code do Portal Cliente"
                className="w-40 h-40 md:w-48 md:h-48 rounded-lg border bg-white p-2"
              />
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Link da landing</label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={portalUrl} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(portalUrl, "landing")}>
                      {copied === "landing" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Link direto pra Agendar (já logada)
                  </label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={portalAgendarUrl} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(portalAgendarUrl, "agendar")}>
                      {copied === "agendar" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="default" size="sm">
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Compartilhar no WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir como cliente
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={qrSrc} download="qr-portal-cliente.png">
                      <QrCode className="h-4 w-4 mr-2" />
                      Baixar QR Code
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Como usar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como ativar serviços no portal</CardTitle>
            <CardDescription>
              Por padrão nenhum serviço aparece no portal cliente — você decide quais ela
              pode agendar sozinha (corte, escova) vs quais pedem avaliação na recepção
              (mecha, química).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Vai em <strong>Serviços</strong> → edita o serviço desejado</li>
              <li>Liga o switch <strong>"Disponibilizar para agendamento online"</strong></li>
              <li>Confere que o profissional que atende esse serviço tem <strong>"Possuo agenda"</strong> ativo + horário cadastrado</li>
              <li>Pronto — serviço aparece no portal pra cliente escolher</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayoutNew>
  );
}
