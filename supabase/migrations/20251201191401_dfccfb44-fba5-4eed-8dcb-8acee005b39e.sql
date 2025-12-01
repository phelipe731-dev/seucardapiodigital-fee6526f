-- Create loyalty_customers table
CREATE TABLE public.loyalty_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  points INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, customer_phone)
);

-- Create loyalty_transactions table for history
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_phone TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points_earned INTEGER NOT NULL,
  transaction_type TEXT DEFAULT 'purchase',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_customers
CREATE POLICY "Restaurant owners can view their loyalty customers"
ON public.loyalty_customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_customers.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners and waiters can manage loyalty customers"
ON public.loyalty_customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_customers.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
  OR
  public.has_role(auth.uid(), 'waiter')
);

-- RLS Policies for loyalty_transactions
CREATE POLICY "Restaurant owners can view loyalty transactions"
ON public.loyalty_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_transactions.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners and waiters can create loyalty transactions"
ON public.loyalty_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = loyalty_transactions.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
  OR
  public.has_role(auth.uid(), 'waiter')
);

-- Trigger for updated_at
CREATE TRIGGER update_loyalty_customers_updated_at
BEFORE UPDATE ON public.loyalty_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically add loyalty points when order is completed
CREATE OR REPLACE FUNCTION public.process_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_add INTEGER;
  current_points INTEGER;
BEGIN
  -- Only process when order status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate points: 1 point per R$ 10 spent
    points_to_add := FLOOR(NEW.total_amount / 10);
    
    -- Insert or update loyalty customer
    INSERT INTO public.loyalty_customers (
      restaurant_id,
      customer_phone,
      customer_name,
      points,
      total_spent,
      visit_count
    )
    VALUES (
      NEW.restaurant_id,
      NEW.customer_phone,
      NEW.customer_name,
      points_to_add,
      NEW.total_amount,
      1
    )
    ON CONFLICT (restaurant_id, customer_phone)
    DO UPDATE SET
      points = loyalty_customers.points + points_to_add,
      total_spent = loyalty_customers.total_spent + NEW.total_amount,
      visit_count = loyalty_customers.visit_count + 1,
      customer_name = COALESCE(EXCLUDED.customer_name, loyalty_customers.customer_name),
      updated_at = now();
    
    -- Get current points and update tier
    SELECT points INTO current_points
    FROM loyalty_customers
    WHERE restaurant_id = NEW.restaurant_id
    AND customer_phone = NEW.customer_phone;
    
    -- Update tier based on points
    UPDATE loyalty_customers
    SET tier = CASE
      WHEN current_points >= 1000 THEN 'ouro'
      WHEN current_points >= 500 THEN 'prata'
      ELSE 'bronze'
    END
    WHERE restaurant_id = NEW.restaurant_id
    AND customer_phone = NEW.customer_phone;
    
    -- Record transaction
    INSERT INTO public.loyalty_transactions (
      restaurant_id,
      customer_phone,
      order_id,
      points_earned,
      transaction_type,
      description
    )
    VALUES (
      NEW.restaurant_id,
      NEW.customer_phone,
      NEW.id,
      points_to_add,
      'purchase',
      'Compra finalizada'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER process_loyalty_points_on_order_completion
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.process_loyalty_points();

-- Create index for faster queries
CREATE INDEX idx_loyalty_customers_restaurant_phone ON public.loyalty_customers(restaurant_id, customer_phone);
CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(restaurant_id, customer_phone, created_at DESC);