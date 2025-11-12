import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: {
    id: string;
    name: string;
    whatsapp: string;
    accepts_delivery: boolean;
  };
}

export function CartSheet({ open, onOpenChange, restaurant }: CartSheetProps) {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, updateObservations, clearCart, total } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinishOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Por favor, informe o endereço de entrega");
      return;
    }
    if (!paymentMethod) {
      toast.error("Por favor, selecione a forma de pagamento");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione itens ao carrinho antes de finalizar");
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          total_amount: total,
          payment_method: paymentMethod,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        observations: item.observations || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Generate WhatsApp message
      const orderTypeText = orderType === "delivery" ? "🚚 DELIVERY" : "🏪 RETIRADA";
      let message = `🍽️ *NOVO PEDIDO - ${restaurant.name}*\n`;
      message += `${orderTypeText}\n\n`;
      message += `👤 *Cliente:* ${customerName}\n`;
      if (customerPhone) message += `📱 *Telefone:* ${customerPhone}\n`;
      if (orderType === "delivery") {
        message += `📍 *Endereço:* ${deliveryAddress}\n`;
      }
      message += `💳 *Forma de pagamento:* ${paymentMethod}\n`;
      
      if (paymentMethod === "PIX") {
        message += `⚠️ *AGUARDANDO COMPROVANTE PIX*\n`;
      }
      
      message += `\n*Itens do pedido:*\n`;

      items.forEach((item) => {
        message += `\n• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        if (item.observations) {
          message += `  _Obs: ${item.observations}_\n`;
        }
      });

      message += `\n*Total: R$ ${total.toFixed(2)}*`;

      // Open WhatsApp
      const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      // Clear cart and close sheet
      clearCart();
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("");
      setDeliveryAddress("");
      onOpenChange(false);

      toast.success("Pedido enviado com sucesso!");
      
      // Navigate to order tracking page
      navigate(`/pedido?id=${order.id}`);
    } catch (error: any) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seu Pedido</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Seu carrinho está vazio
            </p>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)} cada
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 ml-auto"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Observações (opcional)"
                        value={item.observations || ""}
                        onChange={(e) => updateObservations(item.id, e.target.value)}
                        className="mt-2"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              <div className="space-y-4 border-t pt-4">
                {restaurant.accepts_delivery && (
                  <div className="space-y-2">
                    <Label>Tipo de Pedido *</Label>
                    <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as "delivery" | "pickup")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="font-normal cursor-pointer">
                          🏪 Retirada no local
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="delivery" id="delivery" />
                        <Label htmlFor="delivery" className="font-normal cursor-pointer">
                          🚚 Delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="customerName">Seu Nome *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Digite seu nome"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Telefone (opcional)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {orderType === "delivery" && (
                  <div>
                    <Label htmlFor="deliveryAddress">Endereço de Entrega *</Label>
                    <Textarea
                      id="deliveryAddress"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Rua, número, bairro, complemento..."
                      rows={3}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMethod === "PIX" && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      ⚠️ Após enviar o pedido via WhatsApp, envie o comprovante PIX para confirmar o pedido.
                    </p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Finish Button */}
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleFinishOrder}
                disabled={loading}
              >
                {loading ? "Processando..." : "Finalizar Pedido"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
