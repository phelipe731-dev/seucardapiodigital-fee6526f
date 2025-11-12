-- Add product options/complements
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_option_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add delivery zones
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  min_order NUMERIC DEFAULT 0,
  delivery_time INTEGER DEFAULT 45,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add preparation time and theme to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS prep_time_min INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS prep_time_max INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS theme_primary_color TEXT DEFAULT '#DC2626',
ADD COLUMN IF NOT EXISTS theme_secondary_color TEXT DEFAULT '#EA580C';

-- Add category to products for better organization
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 15;

-- Enable RLS
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_options
CREATE POLICY "Anyone can view product options"
ON public.product_options
FOR SELECT
USING (true);

CREATE POLICY "Restaurant owners can manage their product options"
ON public.product_options
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.restaurants r ON r.id = p.restaurant_id
  WHERE p.id = product_options.product_id AND r.owner_id = auth.uid()
));

-- RLS Policies for product_option_items
CREATE POLICY "Anyone can view product option items"
ON public.product_option_items
FOR SELECT
USING (true);

CREATE POLICY "Restaurant owners can manage their product option items"
ON public.product_option_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.product_options po
  JOIN public.products p ON p.id = po.product_id
  JOIN public.restaurants r ON r.id = p.restaurant_id
  WHERE po.id = product_option_items.option_id AND r.owner_id = auth.uid()
));

-- RLS Policies for delivery_zones
CREATE POLICY "Anyone can view active delivery zones"
ON public.delivery_zones
FOR SELECT
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their delivery zones"
ON public.delivery_zones
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE restaurants.id = delivery_zones.restaurant_id AND restaurants.owner_id = auth.uid()
));