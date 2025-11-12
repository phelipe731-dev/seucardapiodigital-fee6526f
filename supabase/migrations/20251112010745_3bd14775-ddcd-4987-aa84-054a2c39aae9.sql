-- Add opening hours fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS accepts_delivery BOOLEAN DEFAULT false;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_products INTEGER,
  max_categories INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default plans
INSERT INTO public.subscription_plans (name, description, price, duration_days, max_products, max_categories)
VALUES 
  ('Básico', 'Plano básico para começar', 29.90, 30, 50, 10),
  ('Profissional', 'Plano profissional com mais recursos', 59.90, 30, 200, 30),
  ('Premium', 'Plano premium sem limites', 99.90, 30, NULL, NULL)
ON CONFLICT DO NOTHING;