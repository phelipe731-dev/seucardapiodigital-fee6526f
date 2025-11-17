import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Smartphone, FileText, QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface SubscriptionPaymentCheckoutProps {
  restaurantId: string;
  plan: Tables<'subscription_plans'>;
  onPaymentSuccess: () => void;
}

export const SubscriptionPaymentCheckout = ({
  restaurantId,
  plan,
  onPaymentSuccess,
}: SubscriptionPaymentCheckoutProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO'>('PIX');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, phone, owner_id')
        .eq('id', restaurantId)
        .single();

      if (!restaurant) throw new Error('Restaurant not found');

      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: {
          type: 'subscription',
          restaurantId,
          subscriptionPlanId: plan.id,
          amount: plan.price,
          paymentMethod,
          customerName: restaurant.name,
          customerPhone: restaurant.phone,
        },
      });

      if (error) throw error;

      if (paymentMethod === 'PIX') {
        setPixData({
          qrCode: data.pixQrCode,
          copyPaste: data.pixCopyPaste,
        });
        toast({
          title: "QR Code gerado!",
          description: "Escaneie o QR Code ou copie o código para pagar",
        });
      } else if (paymentMethod === 'BOLETO') {
        setBoletoUrl(data.boletoUrl);
        toast({
          title: "Boleto gerado!",
          description: "Clique no botão para visualizar e pagar o boleto",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamentos",
      });
    }
  };

  if (pixData) {
    return (
      <Card className="p-8 max-w-md mx-auto">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Pague com PIX</h3>
          <p className="text-muted-foreground mb-6">
            Plano: {plan.name} - R$ {plan.price.toFixed(2)}/mês
          </p>

          {pixData.qrCode && (
            <div className="mb-6 bg-white p-4 rounded-lg inline-block">
              <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-64 h-64" />
            </div>
          )}

          <Button onClick={copyPixCode} className="w-full mb-4" variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Copiar código PIX
          </Button>

          <p className="text-sm text-muted-foreground">
            O pagamento será confirmado automaticamente após a compensação
          </p>
        </div>
      </Card>
    );
  }

  if (boletoUrl) {
    return (
      <Card className="p-8 max-w-md mx-auto">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">Boleto Gerado!</h3>
          <p className="text-muted-foreground mb-6">
            Plano: {plan.name} - R$ {plan.price.toFixed(2)}/mês
          </p>

          <Button onClick={() => window.open(boletoUrl, '_blank')} className="w-full mb-4">
            <FileText className="mr-2 h-4 w-4" />
            Visualizar Boleto
          </Button>

          <p className="text-sm text-muted-foreground">
            Pague o boleto em qualquer banco ou casa lotérica
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-md mx-auto">
      <h3 className="text-2xl font-bold mb-6">Assinatura do Plano</h3>
      
      <div className="mb-6 p-6 bg-primary/5 rounded-lg border-2 border-primary/20">
        <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
        <p className="text-muted-foreground mb-4">{plan.description}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">R$ {plan.price.toFixed(2)}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>
        
        {plan.max_products && (
          <p className="mt-4 text-sm">
            <CheckCircle2 className="inline h-4 w-4 mr-2 text-primary" />
            Até {plan.max_products} produtos
          </p>
        )}
        {plan.max_categories && (
          <p className="text-sm">
            <CheckCircle2 className="inline h-4 w-4 mr-2 text-primary" />
            Até {plan.max_categories} categorias
          </p>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold mb-4 block">Forma de Pagamento</Label>
          <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="PIX" id="pix-sub" />
              <Label htmlFor="pix-sub" className="flex items-center gap-2 cursor-pointer flex-1">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="font-medium">PIX - Aprovação instantânea</span>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="BOLETO" id="boleto" />
              <Label htmlFor="boleto" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Boleto Bancário</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={handlePayment} 
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>Confirmar Assinatura</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Ao confirmar, você concorda com nossos termos de serviço
        </p>
      </div>
    </Card>
  );
};
