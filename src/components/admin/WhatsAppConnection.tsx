import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, CheckCircle2, XCircle, RefreshCw, Phone, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppStatus {
  ready: boolean;
  connected: boolean;
  info?: {
    phone: string;
    name: string;
    platform: string;
  };
}

export function WhatsAppConnection() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus>({ ready: false, connected: false });
  const [workerUrl, setWorkerUrl] = useState("http://localhost:3002");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do sistema.");

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [workerUrl]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${workerUrl}/health`);
      if (!response.ok) throw new Error("Worker offline");
      
      const data = await response.json();
      setStatus(data.whatsapp);
      
      // If connected, clear QR
      if (data.whatsapp.connected) {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Failed to check status:", error);
    }
  };

  const loadQRCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${workerUrl}/qr`);
      
      if (!response.ok) {
        throw new Error("Worker não está respondendo");
      }
      
      const data = await response.json();
      
      if (data.connected) {
        toast.success("WhatsApp já está conectado!");
        setStatus({ ready: true, connected: true, info: data.info });
        setQrCode(null);
      } else if (data.qr) {
        setQrCode(data.qr);
        toast.info("Escaneie o QR Code com seu WhatsApp!");
      } else {
        toast.warning("Aguarde, inicializando...");
        setTimeout(loadQRCode, 3000);
      }
    } catch (error: any) {
      console.error("Error loading QR:", error);
      toast.error("Erro ao conectar. Verifique se o worker está rodando em " + workerUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${workerUrl}/disconnect`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error("Erro ao desconectar");
      
      toast.success("WhatsApp desconectado!");
      setStatus({ ready: false, connected: false });
      setQrCode(null);
      
      // Wait and reload QR
      setTimeout(loadQRCode, 3000);
    } catch (error: any) {
      toast.error("Erro ao desconectar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone) {
      toast.error("Digite um número de telefone");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${workerUrl}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar mensagem");
      }
      
      toast.success("Mensagem de teste enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          <strong>📱 WhatsApp Web Simples</strong> - Conecte seu WhatsApp escaneando o QR Code. 
          As notificações de pedidos serão enviadas automaticamente!
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Status da Conexão
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp para enviar notificações automáticas aos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {status.connected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">WhatsApp Conectado</p>
                    {status.info && (
                      <div className="text-sm text-muted-foreground">
                        <p>Nome: {status.info.name}</p>
                        <p>Telefone: +{status.info.phone}</p>
                        <p>Plataforma: {status.info.platform}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  <p className="font-medium">WhatsApp Desconectado</p>
                </>
              )}
            </div>
            <Badge variant={status.connected ? "default" : "secondary"}>
              {status.connected ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Worker URL Config */}
          <div className="space-y-2">
            <Label htmlFor="worker_url">URL do Worker WhatsApp</Label>
            <Input
              id="worker_url"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              placeholder="http://localhost:3002"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Endereço onde o worker WhatsApp está rodando
            </p>
          </div>

          {/* QR Code */}
          {qrCode && (
            <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg bg-white p-4"
              />
              <p className="mt-4 text-sm text-center font-medium">
                📱 Escaneie este QR Code com seu WhatsApp
              </p>
              <ol className="mt-2 text-xs text-center text-muted-foreground space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em Mais opções (⋮) → Dispositivos conectados</li>
                <li>3. Toque em Conectar dispositivo</li>
                <li>4. Aponte seu celular para esta tela</li>
              </ol>
              <div className="mt-4 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-xs text-muted-foreground">Aguardando conexão...</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!status.connected ? (
              <Button
                onClick={loadQRCode}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                Desconectar WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      {status.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Testar Envio de Mensagem
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para verificar se está funcionando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test_phone">Número de Telefone</Label>
              <Input
                id="test_phone"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999998888"
              />
              <p className="text-xs text-muted-foreground">
                Digite com código do país (55 para Brasil), sem espaços ou caracteres especiais
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_message">Mensagem</Label>
              <Input
                id="test_message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Mensagem de teste"
              />
            </div>

            <Button
              onClick={handleTestMessage}
              disabled={loading || !testPhone}
              className="w-full"
              variant="secondary"
            >
              {loading ? "Enviando..." : "Enviar Mensagem de Teste"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <p className="font-medium text-sm">✅ Notificações Automáticas:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Pedido Recebido:</strong> Cliente recebe confirmação instantânea</li>
              <li><strong>Em Preparo:</strong> Notifica quando começar a preparar</li>
              <li><strong>Pronto:</strong> Avisa quando pedido estiver pronto</li>
              <li><strong>Saiu para Entrega:</strong> Informa que pedido está a caminho</li>
              <li><strong>Entregue:</strong> Confirma entrega e agradece</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <p className="font-medium text-sm">🚀 Instalação do Worker:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o terminal na pasta whatsapp-worker/</li>
              <li>Execute: <code className="bg-muted px-1 py-0.5 rounded">npm install</code></li>
              <li>Configure o .env com sua Service Key do Supabase</li>
              <li>Execute: <code className="bg-muted px-1 py-0.5 rounded">npm start</code></li>
              <li>Volte aqui e clique em "Conectar WhatsApp"</li>
            </ol>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>⚠️ Importante:</strong> Mantenha o worker rodando para as notificações funcionarem. 
              Use Docker, PM2 ou systemd para manter em produção.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
