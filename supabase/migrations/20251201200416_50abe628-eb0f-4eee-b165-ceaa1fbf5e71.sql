-- Add waiter_id to open_tabs to track which waiter created the tab
ALTER TABLE public.open_tabs
ADD COLUMN waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add waiter_id to orders to track which waiter processed the order
ALTER TABLE public.orders
ADD COLUMN waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create waiter_ratings table for customer ratings
CREATE TABLE public.waiter_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on waiter_ratings
ALTER TABLE public.waiter_ratings ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can view ratings for their waiters
CREATE POLICY "Restaurant owners can view waiter ratings"
ON public.waiter_ratings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = waiter_ratings.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Anyone can create waiter ratings (customers)
CREATE POLICY "Anyone can create waiter ratings"
ON public.waiter_ratings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_waiter_ratings_waiter_id ON public.waiter_ratings(waiter_id);
CREATE INDEX idx_waiter_ratings_restaurant_id ON public.waiter_ratings(restaurant_id);
CREATE INDEX idx_open_tabs_waiter_id ON public.open_tabs(waiter_id);
CREATE INDEX idx_orders_waiter_id ON public.orders(waiter_id);