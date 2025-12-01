-- FASE 1.1: Sistema de Cupons e Promoções

-- Tabela de cupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value numeric NOT NULL CHECK (value > 0),
  min_order numeric DEFAULT 0 CHECK (min_order >= 0),
  max_uses integer CHECK (max_uses > 0),
  current_uses integer DEFAULT 0 CHECK (current_uses >= 0),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(restaurant_id, code)
);

-- Tabela de uso de cupons
CREATE TABLE public.coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  customer_phone text,
  order_id uuid REFERENCES public.orders(id),
  discount_amount numeric NOT NULL CHECK (discount_amount >= 0),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies para coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Restaurant owners can manage their coupons"
ON public.coupons
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE restaurants.id = coupons.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- RLS Policies para coupon_uses
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create coupon uses"
ON public.coupon_uses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Restaurant owners can view their coupon uses"
ON public.coupon_uses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.coupons c
  JOIN public.restaurants r ON r.id = c.restaurant_id
  WHERE c.id = coupon_uses.coupon_id
  AND r.owner_id = auth.uid()
));

-- Trigger para atualizar updated_at em coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- FASE 1.2: Sistema de Resgate de Pontos de Fidelidade

-- Tabela de recompensas disponíveis
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  points_required integer NOT NULL CHECK (points_required > 0),
  reward_type text NOT NULL CHECK (reward_type IN ('discount', 'product', 'free_delivery')),
  reward_value numeric CHECK (reward_value >= 0),
  product_id uuid REFERENCES public.products(id),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de histórico de resgates
CREATE TABLE public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) NOT NULL,
  customer_phone text NOT NULL,
  reward_id uuid REFERENCES public.loyalty_rewards(id),
  points_spent integer NOT NULL CHECK (points_spent > 0),
  order_id uuid REFERENCES public.orders(id),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies para loyalty_rewards
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active loyalty rewards"
ON public.loyalty_rewards
FOR SELECT
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their loyalty rewards"
ON public.loyalty_rewards
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE restaurants.id = loyalty_rewards.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- RLS Policies para loyalty_redemptions
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create loyalty redemptions"
ON public.loyalty_redemptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Restaurant owners can view their loyalty redemptions"
ON public.loyalty_redemptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE restaurants.id = loyalty_redemptions.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

CREATE POLICY "Restaurant owners and waiters can manage redemptions"
ON public.loyalty_redemptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_redemptions.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ) OR has_role(auth.uid(), 'waiter'::app_role)
);

-- Trigger para atualizar updated_at em loyalty_rewards
CREATE TRIGGER update_loyalty_rewards_updated_at
BEFORE UPDATE ON public.loyalty_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- FASE 1.3: Sistema de Combos

-- Tabela de combos
CREATE TABLE public.combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  original_price numeric NOT NULL CHECK (original_price >= 0),
  combo_price numeric NOT NULL CHECK (combo_price >= 0),
  is_active boolean DEFAULT true,
  available_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  available_start_time time,
  available_end_time time,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de itens do combo
CREATE TABLE public.combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid REFERENCES public.combos(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies para combos
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active combos"
ON public.combos
FOR SELECT
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their combos"
ON public.combos
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE restaurants.id = combos.restaurant_id
  AND restaurants.owner_id = auth.uid()
));

-- RLS Policies para combo_items
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view combo items"
ON public.combo_items
FOR SELECT
USING (true);

CREATE POLICY "Restaurant owners can manage their combo items"
ON public.combo_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.combos c
  JOIN public.restaurants r ON r.id = c.restaurant_id
  WHERE c.id = combo_items.combo_id
  AND r.owner_id = auth.uid()
));

-- Trigger para atualizar updated_at em combos
CREATE TRIGGER update_combos_updated_at
BEFORE UPDATE ON public.combos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();