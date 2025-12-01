import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Printer, Save, TestTube, FileText, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PrinterConfig {
  id?: string;
  printer_ip: string;
  printer_port: number;
  save_pdf: boolean;
  pdf_output_dir: string;
  print_retries: number;
  print_timeout_ms: number;
  is_active: boolean;
}

interface PrintedOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  printed_at: string;
  created_at: string;
}

export default function PrinterSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [printedOrders, setPrintedOrders] = useState<PrintedOrder[]>([]);
  
  const [config, setConfig] = useState<PrinterConfig>({
    printer_ip: "192.168.0.100",
    printer_port: 9100,
    save_pdf: true,
    pdf_output_dir: "./pdfs",
    print_retries: 3,
    print_timeout_ms: 10000,
    is_active: true,
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      loadConfig();
      loadPrintedOrders();
    }
  }, [restaurantId]);

  async function loadRestaurant() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (restaurant) {
        setRestaurantId(restaurant.id);
      }
    } catch (error) {
      console.error("Error loading restaurant:", error);
      toast.error("Erro ao carregar restaurante");
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from("printer_configs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No config exists yet, use defaults
          return;
        }
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Erro ao carregar configuração");
    }
  }

  async function loadPrintedOrders() {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, printed_at, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("printed", true)
        .order("printed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPrintedOrders(data || []);
    } catch (error) {
      console.error("Error loading printed orders:", error);
    }
  }

  async function handleSave() {
    if (!restaurantId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("printer_configs")
        .upsert({
          restaurant_id: restaurantId,
          ...config,
        })
        .select()
        .single();

      if (error) throw error;

      setConfig(data);
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPrint() {
    setTesting(true);
    try {
      // Create a test order
      const testOrder = {
        restaurant_id: restaurantId,
        customer_name: "TESTE - Impressão",
        customer_phone: "(11) 99999-9999",
        payment_method: "Teste",
        total_amount: 99.99,
        notes: "Este é um pedido de teste para verificar a impressão.",
        status: "pending",
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(testOrder)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create test order items
      await supabase.from("order_items").insert([
        {
          order_id: order.id,
          product_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
          quantity: 2,
          unit_price: 39.90,
          observations: "Teste de impressão",
        },
        {
          order_id: order.id,
          product_id: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
          unit_price: 20.19,
        },
      ]);

      toast.success("Pedido de teste criado! O worker deve imprimir automaticamente.");
      
      // Reload printed orders after a delay
      setTimeout(() => {
        loadPrintedOrders();
      }, 3000);
    } catch (error) {
      console.error("Error creating test order:", error);
      toast.error("Erro ao criar pedido de teste");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Printer className="w-8 h-8" />
          Configuração de Impressora
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure a impressora térmica para impressão automática de pedidos
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          <strong>Importante:</strong> O worker Node.js deve estar rodando para a impressão funcionar.
          Consulte o README.md em printer-worker/ para instruções de instalação.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Impressora</CardTitle>
            <CardDescription>
              Configure o IP e porta da sua impressora térmica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="printer_ip">IP da Impressora</Label>
              <Input
                id="printer_ip"
                value={config.printer_ip}
                onChange={(e) => setConfig({ ...config, printer_ip: e.target.value })}
                placeholder="192.168.0.100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer_port">Porta</Label>
              <Input
                id="printer_port"
                type="number"
                value={config.printer_port}
                onChange={(e) => setConfig({ ...config, printer_port: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="print_retries">Tentativas de Impressão</Label>
              <Input
                id="print_retries"
                type="number"
                value={config.print_retries}
                onChange={(e) => setConfig({ ...config, print_retries: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="print_timeout">Timeout (ms)</Label>
              <Input
                id="print_timeout"
                type="number"
                value={config.print_timeout_ms}
                onChange={(e) => setConfig({ ...config, print_timeout_ms: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Impressão Ativa</Label>
              <Switch
                id="is_active"
                checked={config.is_active}
                onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </CardContent>
        </Card>

        {/* PDF Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de PDF</CardTitle>
            <CardDescription>
              Configure a geração automática de PDF dos recibos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="save_pdf">Gerar PDF</Label>
              <Switch
                id="save_pdf"
                checked={config.save_pdf}
                onCheckedChange={(checked) => setConfig({ ...config, save_pdf: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf_output_dir">Diretório de Saída</Label>
              <Input
                id="pdf_output_dir"
                value={config.pdf_output_dir}
                onChange={(e) => setConfig({ ...config, pdf_output_dir: e.target.value })}
                placeholder="./pdfs"
              />
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={handleTestPrint}
                disabled={testing}
                variant="secondary"
                className="w-full"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testing ? "Criando teste..." : "Criar Pedido de Teste"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cria um pedido de teste que será impresso automaticamente pelo worker
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printed Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Últimos Pedidos Impressos</CardTitle>
          <CardDescription>
            Pedidos que foram impressos com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {printedOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum pedido impresso ainda
            </p>
          ) : (
            <div className="space-y-2">
              {printedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Impresso em {new Date(order.printed_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      R$ {order.total_amount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
