import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WhatsAppConnection() {
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string>("");
  const [config, setConfig] = useState({
    evolution_url: "",
    instance_name: "",
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRestaurantId(data.id);
        setConnected(data.whatsapp_connected || false);
        setPhone(data.whatsapp_phone || "");
        setConfig({
          evolution_url: data.whatsapp_evolution_url || "",
          instance_name: data.whatsapp_evolution_instance || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar restaurante:", error);
    }
  };

  const saveConfig = async () => {
    if (!restaurantId) return;
    if (!config.evolution_url || !config.instance_name) {
      toast.error("Preencha a URL e o nome da instância");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          whatsapp_evolution_url: config.evolution_url,
          whatsapp_evolution_instance: config.instance_name,
        })
        .eq("id", restaurantId);

      if (error) throw error;
      toast.success("Configuração salva!");
    } catch (error: any) {
      toast.error("Erro ao salvar configuração");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!config.evolution_url || !config.instance_name) {
      toast.error("Configure a URL e instância primeiro");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.evolution_url}/instance/connect/${config.instance_name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error("Erro ao gerar QR Code");

      const data = await response.json();
      if (data.base64) {
        setQrCode(data.base64);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp");
        checkConnection();
      }
    } catch (error: any) {
      toast.error("Erro ao gerar QR Code. Verifique a configuração do Evolution API");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    if (!config.evolution_url || !config.instance_name) return;

    try {
      const response = await fetch(`${config.evolution_url}/instance/connectionState/${config.instance_name}`);
      const data = await response.json();

      if (data.state === 'open') {
        setConnected(true);
        setQrCode(null);
        
        // Buscar número conectado
        const infoResponse = await fetch(`${config.evolution_url}/instance/fetchInstances?instanceName=${config.instance_name}`);
        const infoData = await infoResponse.json();
        
        if (infoData[0]?.instance?.owner) {
          const phoneNumber = infoData[0].instance.owner.split('@')[0];
          setPhone(phoneNumber);
          
          // Salvar no banco
          if (restaurantId) {
            await supabase
              .from("restaurants")
              .update({
                whatsapp_connected: true,
                whatsapp_phone: phoneNumber
              })
              .eq("id", restaurantId);
          }
        }
        
        toast.success("WhatsApp conectado com sucesso!");
      } else {
        setTimeout(checkConnection, 3000);
      }
    } catch (error) {
      console.error("Erro ao verificar conexão:", error);
    }
  };

  const disconnect = async () => {
    if (!config.evolution_url || !config.instance_name) return;

    setLoading(true);
    try {
      await fetch(`${config.evolution_url}/instance/logout/${config.instance_name}`, {
        method: 'DELETE'
      });

      setConnected(false);
      setPhone("");
      setQrCode(null);

      if (restaurantId) {
        await supabase
          .from("restaurants")
          .update({
            whatsapp_connected: false,
            whatsapp_phone: null
          })
          .eq("id", restaurantId);
      }

      toast.success("WhatsApp desconectado");
    } catch (error: any) {
      toast.error("Erro ao desconectar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Conectar WhatsApp via QR Code
        </CardTitle>
        <CardDescription>
          Conecte seu WhatsApp Business sem precisar de API paga
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da Conexão */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">WhatsApp Conectado</p>
                  {phone && (
                    <p className="text-sm text-muted-foreground">
                      Número: +{phone}
                    </p>
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
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Configuração do Evolution API */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evolution_url">URL do Evolution API</Label>
            <Input
              id="evolution_url"
              placeholder="https://seu-servidor.com"
              value={config.evolution_url}
              onChange={(e) => setConfig({ ...config, evolution_url: e.target.value })}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              URL do seu servidor Evolution API (sem barra no final)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance_name">Nome da Instância</Label>
            <Input
              id="instance_name"
              placeholder="meu-restaurante"
              value={config.instance_name}
              onChange={(e) => setConfig({ ...config, instance_name: e.target.value })}
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              Nome único para identificar seu restaurante
            </p>
          </div>

          {!connected && (
            <Button
              onClick={saveConfig}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Salvar Configuração
            </Button>
          )}
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
            <img
              src={qrCode}
              alt="QR Code WhatsApp"
              className="w-64 h-64 rounded-lg"
            />
            <p className="mt-4 text-sm text-center text-muted-foreground">
              Abra o WhatsApp no seu celular e escaneie este QR Code
            </p>
            <p className="text-xs text-center text-muted-foreground mt-2">
              WhatsApp → Dispositivos Conectados → Conectar Dispositivo
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          {!connected ? (
            <Button
              onClick={generateQRCode}
              disabled={loading || !config.evolution_url || !config.instance_name}
              className="flex-1"
              variant="gradient"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Gerar QR Code
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnect}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              Desconectar WhatsApp
            </Button>
          )}
        </div>

        {/* Instruções */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
          <p className="font-medium text-sm">Como configurar:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Instale o Evolution API no seu servidor</li>
            <li>Configure a URL e nome da instância acima</li>
            <li>Clique em "Gerar QR Code"</li>
            <li>Escaneie o QR Code com seu WhatsApp Business</li>
            <li>Pronto! As notificações serão enviadas automaticamente</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            <strong>Precisa de ajuda?</strong> Veja o tutorial completo de instalação do Evolution API:{" "}
            <a
              href="https://doc.evolution-api.com/v2/pt/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Documentação Evolution API
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
