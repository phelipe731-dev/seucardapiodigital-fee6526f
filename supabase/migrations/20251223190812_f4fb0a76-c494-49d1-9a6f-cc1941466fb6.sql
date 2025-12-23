-- Add cover_url, delivery times and payment methods to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS delivery_time_min integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS delivery_time_max integer DEFAULT 45,
ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT ARRAY['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito']::text[];