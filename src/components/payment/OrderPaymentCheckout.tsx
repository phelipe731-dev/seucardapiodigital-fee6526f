import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Smartphone, QrCode, Loader2 } from "lucide-react";

interface OrderPaymentCheckoutProps {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  onPaymentSuccess: () => void;
}

export const OrderPaymentCheckout = ({
  orderId,
  amount,
  customerName,
  customerPhone,
  onPaymentSuccess,
}: OrderPaymentCheckoutProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD'>('PIX');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [cardData, setCardData] = useState({
    holderName: customerName,
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cpfCnpj: '',
    email: '',
  });
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const requestData: any = {
        type: 'order',
        orderId,
        amount,
        paymentMethod,
        customerName,
        customerPhone,
      };

      if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
        if (!cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv) {
          toast({
            title: "Dados incompletos",
            description: "Preencha todos os dados do cartão",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        requestData.creditCardData = {
          holderName: cardData.holderName,
          number: cardData.number.replace(/\s/g, ''),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        };
        requestData.customerCpfCnpj = cardData.cpfCnpj;
        requestData.customerEmail = cardData.email;
      }

      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: requestData,
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
      } else {
        toast({
          title: "Pagamento processado!",
          description: "Aguarde a confirmação do pagamento",
        });
        onPaymentSuccess();
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
            Valor: R$ {amount.toFixed(2)}
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

  return (
    <Card className="p-8 max-w-md mx-auto">
      <h3 className="text-2xl font-bold mb-6">Pagamento</h3>
      
      <div className="mb-6">
        <p className="text-lg font-semibold">
          Valor total: <span className="text-primary">R$ {amount.toFixed(2)}</span>
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold mb-4 block">Forma de Pagamento</Label>
          <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="PIX" id="pix" />
              <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="font-medium">PIX - Aprovação instantânea</span>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="CREDIT_CARD" id="credit" />
              <Label htmlFor="credit" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium">Cartão de Crédito</span>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="DEBIT_CARD" id="debit" />
              <Label htmlFor="debit" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium">Cartão de Débito</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                placeholder="0000 0000 0000 0000"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                maxLength={19}
              />
            </div>

            <div>
              <Label htmlFor="holderName">Nome no Cartão</Label>
              <Input
                id="holderName"
                placeholder="Nome completo"
                value={cardData.holderName}
                onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Mês</Label>
                <Input
                  id="expiryMonth"
                  placeholder="MM"
                  value={cardData.expiryMonth}
                  onChange={(e) => setCardData({ ...cardData, expiryMonth: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="expiryYear">Ano</Label>
                <Input
                  id="expiryYear"
                  placeholder="AAAA"
                  value={cardData.expiryYear}
                  onChange={(e) => setCardData({ ...cardData, expiryYear: e.target.value })}
                  maxLength={4}
                />
              </div>
              <div>
                <Label htmlFor="ccv">CVV</Label>
                <Input
                  id="ccv"
                  placeholder="000"
                  value={cardData.ccv}
                  onChange={(e) => setCardData({ ...cardData, ccv: e.target.value })}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cpf">CPF/CNPJ</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cardData.cpfCnpj}
                onChange={(e) => setCardData({ ...cardData, cpfCnpj: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={cardData.email}
                onChange={(e) => setCardData({ ...cardData, email: e.target.value })}
              />
            </div>
          </div>
        )}

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
            <>Confirmar Pagamento</>
          )}
        </Button>
      </div>
    </Card>
  );
};
