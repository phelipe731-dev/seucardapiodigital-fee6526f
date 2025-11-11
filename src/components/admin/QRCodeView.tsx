import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, ExternalLink } from "lucide-react";

export function QRCodeView() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (restaurant) {
        setRestaurantId(restaurant.id);
        setRestaurantName(restaurant.name);
        
        const menuUrl = `${window.location.origin}/menu/${restaurant.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(menuUrl)}`;
        setQrCodeUrl(qrUrl);
      }
    } catch (error: any) {
      console.error("Erro ao carregar restaurante:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-${restaurantName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("QR Code baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar QR Code");
    }
  };

  const menuUrl = restaurantId ? `${window.location.origin}/menu/${restaurantId}` : "";

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!restaurantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code do Cardápio</CardTitle>
          <CardDescription>
            Configure seu restaurante primeiro para gerar o QR Code
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code do Cardápio</CardTitle>
        <CardDescription>
          Use este QR Code para seus clientes acessarem seu cardápio digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-card">
            <img
              src={qrCodeUrl}
              alt="QR Code do Cardápio"
              className="w-64 h-64"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="gradient" onClick={handleDownload}>
              <Download size={18} className="mr-2" />
              Baixar QR Code
            </Button>
            <Button variant="outline" asChild>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} className="mr-2" />
                Ver Cardápio
              </a>
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Link do Cardápio:</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={menuUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md bg-muted"
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(menuUrl);
                toast.success("Link copiado!");
              }}
            >
              Copiar
            </Button>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <h3 className="font-semibold">Como usar:</h3>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Baixe o QR Code clicando no botão acima</li>
            <li>Imprima em seus materiais (cardápios, mesas, adesivos)</li>
            <li>Clientes escanear o QR Code acessam o cardápio digital</li>
            <li>Pedidos são enviados automaticamente pelo WhatsApp</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
