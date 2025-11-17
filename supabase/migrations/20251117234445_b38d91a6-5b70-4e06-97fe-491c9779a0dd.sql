-- Tabela para armazenar pagamentos dos pedidos dos clientes
CREATE TABLE public.order_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL,
  asaas_invoice_url TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- pix, credit_card, debit_card
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, received, overdue
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  credit_card_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar pagamentos das assinaturas dos restaurantes
CREATE TABLE public.restaurant_subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  subscription_plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  asaas_payment_id TEXT NOT NULL,
  asaas_invoice_url TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- pix, credit_card, debit_card, boleto
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, received, overdue
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  boleto_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_subscription_payments ENABLE ROW LEVEL SECURITY;

-- Policies para order_payments
CREATE POLICY "Anyone can view payment by order"
ON public.order_payments FOR SELECT
USING (true);

CREATE POLICY "Anyone can create order payments"
ON public.order_payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Restaurant owners can view their order payments"
ON public.order_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.id = order_payments.order_id
    AND r.owner_id = auth.uid()
  )
);

-- Policies para restaurant_subscription_payments
CREATE POLICY "Restaurant owners can view their subscription payments"
ON public.restaurant_subscription_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = restaurant_subscription_payments.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can create their subscription payments"
ON public.restaurant_subscription_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = restaurant_subscription_payments.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Índices para melhor performance
CREATE INDEX idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX idx_order_payments_asaas_payment_id ON public.order_payments(asaas_payment_id);
CREATE INDEX idx_restaurant_subscription_payments_restaurant_id ON public.restaurant_subscription_payments(restaurant_id);
CREATE INDEX idx_restaurant_subscription_payments_asaas_payment_id ON public.restaurant_subscription_payments(asaas_payment_id);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_order_payments_updated_at
BEFORE UPDATE ON public.order_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_subscription_payments_updated_at
BEFORE UPDATE ON public.restaurant_subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();