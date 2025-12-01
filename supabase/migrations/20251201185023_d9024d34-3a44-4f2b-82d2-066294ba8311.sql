-- Create table for open tabs (comandas abertas)
CREATE TABLE IF NOT EXISTS public.open_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  tab_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.open_tabs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Restaurant owners can manage their open tabs"
ON public.open_tabs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = open_tabs.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Create index
CREATE INDEX idx_open_tabs_restaurant_id ON public.open_tabs(restaurant_id);

-- Add trigger for updated_at
CREATE TRIGGER update_open_tabs_updated_at
BEFORE UPDATE ON public.open_tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();