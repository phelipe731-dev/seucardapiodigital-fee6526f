import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingBag, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { sendOrderViaWhatsApp, isWhatsAppConfigured } from "@/utils/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CouponInput from "@/components/checkout/CouponInput";

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  min_order: number;
}

interface Restaurant {
  id: string;
  name: string;
  whatsapp: string;
  accepts_delivery: boolean;
}

export default function OrderCheckout() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const { 
    items, 
    clearCart, 
    subtotal, 
    deliveryFee, 
    setDeliveryFee,
    couponDiscount,
    setCouponDiscount,
    appliedCouponId,
    setAppliedCouponId,
    appliedCouponCode,
    setAppliedCouponCode,
    total
  } = useCart();
  
  // Pega o número da mesa da URL se existir
  const tableFromUrl = searchParams.get("mesa");
  
  // Estados do formulário
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState(tableFromUrl || "");
  const [observations, setObservations] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [enableTableQr] = useState(
    import.meta.env.VITE_RESTAURANT_ENABLE_TABLE_QR === 'true'
  );

  useEffect(() => {
    if (restaurantId) {
      loadRestaurant();
      loadDeliveryZones();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (tableFromUrl && enableTableQr) {
      setCustomerName(`Mesa ${tableFromUrl}`);
      setTableNumber(tableFromUrl);
    }
  }, [tableFromUrl, enableTableQr]);

  useEffect(() => {
    if (orderType === "pickup") {
      setDeliveryFee(0);
      setSelectedZone("");
    }
  }, [orderType]);

  const loadRestaurant = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, whatsapp, accepts_delivery")
      .eq("id", restaurantId)
      .single();

    if (!error && data) {
      setRestaurant(data);
    }
  };

  const loadDeliveryZones = async () => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    if (!error && data) {
      setDeliveryZones(data);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
    const zone = deliveryZones.find(z => z.id === zoneId);
    if (zone) {
      setDeliveryFee(Number(zone.fee));
      if (subtotal < zone.min_order) {
        toast.error(`Pedido mínimo para esta zona: R$ ${zone.min_order.toFixed(2)}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error("Carrinho vazio. Adicione itens antes de finalizar.");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome ou número da mesa.");
      return;
    }

    if (orderType === "delivery") {
      if (!deliveryAddress.trim()) {
        toast.error("Por favor, informe o endereço de entrega.");
        return;
      }
      if (!selectedZone) {
        toast.error("Por favor, selecione a zona de entrega.");
        return;
      }
      const zone = deliveryZones.find(z => z.id === selectedZone);
      if (zone && subtotal < zone.min_order) {
        toast.error(`Pedido mínimo para esta zona: R$ ${zone.min_order.toFixed(2)}`);
        return;
      }
    }

    if (!restaurant || !isWhatsAppConfigured(restaurant.whatsapp)) {
      toast.error("WhatsApp do restaurante não configurado.");
      return;
    }

    setLoading(true);

    try {
      // Salvar no histórico se solicitado
      if (saveToHistory) {
        const total = subtotal + deliveryFee;
        const { error } = await supabase.from("orders").insert({
          restaurant_id: restaurantId,
          customer_name: customerName,
          total_amount: total,
          payment_method: 'whatsapp',
          status: 'pending',
          notes: observations || null,
        });

        if (error) {
          console.warn("Erro ao salvar pedido:", error);
          toast.warning("Não foi possível salvar no histórico, mas você pode enviar via WhatsApp.");
        }
      }

      // Enviar via WhatsApp
      await sendOrderViaWhatsApp(
        items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          observations: item.observations,
          selectedOptions: item.selectedOptions,
        })),
        customerName,
        tableNumber || undefined,
        {
          phone: restaurant.whatsapp,
          observations,
          orderType,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
          deliveryFee,
          openInNewTab: true,
        }
      );

      toast.success("Pedido enviado! Confirme no WhatsApp.");
      
      // Limpar carrinho após 2 segundos
      setTimeout(() => {
        clearCart();
        navigate(`/menu/${restaurantId}`);
      }, 2000);

    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCart = () => {
    if (confirm("Deseja realmente limpar o carrinho?")) {
      clearCart();
      toast.success("Carrinho limpo");
    }
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/menu/${restaurantId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Pedido</h1>
            <p className="text-sm text-muted-foreground">{restaurant.name}</p>
          </div>
        </div>

        {/* Mesa Badge (se vindo de QR Code) */}
        {tableFromUrl && enableTableQr && (
          <Badge variant="secondary" className="mb-4">
            📍 Você está na Mesa {tableFromUrl}
          </Badge>
        )}

        {/* Resumo do Carrinho */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Resumo do Pedido
            </CardTitle>
            <CardDescription>
              {items.length} {items.length === 1 ? "item" : "itens"} no carrinho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => {
              const itemTotal = item.price * item.quantity;
              return (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.quantity}x {item.name}
                    </p>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {item.selectedOptions.map(opt => 
                          opt.items.map(i => i.itemName).join(", ")
                        ).join(" • ")}
                      </p>
                    )}
                    {item.observations && (
                      <p className="text-xs text-muted-foreground italic">
                        {item.observations}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">
                    {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              );
            })}
            
            <Separator />
            
            <div className="space-y-3">
              <CouponInput
                restaurantId={restaurantId!}
                subtotal={subtotal}
                onCouponApplied={(discount, couponId, couponCode) => {
                  setCouponDiscount(discount);
                  setAppliedCouponId(couponId);
                  setAppliedCouponCode(couponCode);
                }}
                onCouponRemoved={() => {
                  setCouponDiscount(0);
                  setAppliedCouponId(null);
                  setAppliedCouponCode(null);
                }}
                appliedCouponCode={appliedCouponCode || undefined}
              />
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span>-{couponDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de entrega</span>
                    <span>{deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seus Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome / Mesa *</Label>
                <Input
                  id="name"
                  placeholder="Digite seu nome ou número da mesa"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Alguma observação sobre o pedido?"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="save-history"
                  checked={saveToHistory}
                  onCheckedChange={setSaveToHistory}
                />
                <Label htmlFor="save-history" className="cursor-pointer">
                  Salvar pedido no histórico
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de Pedido */}
          {restaurant.accepts_delivery && deliveryZones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="cursor-pointer">
                      🏪 Retirada no local
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="cursor-pointer">
                      🚚 Entrega
                    </Label>
                  </div>
                </RadioGroup>

                {orderType === "delivery" && (
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço de Entrega *</Label>
                      <Textarea
                        id="address"
                        placeholder="Rua, número, complemento, bairro..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        required={orderType === "delivery"}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zone">Zona de Entrega *</Label>
                      <Select value={selectedZone} onValueChange={handleZoneChange}>
                        <SelectTrigger id="zone">
                          <SelectValue placeholder="Selecione a zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryZones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} - {zone.fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              {zone.min_order > 0 && ` (mín. ${zone.min_order.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || items.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar Pedido por WhatsApp
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleClearCart}
              disabled={loading || items.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Carrinho
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
