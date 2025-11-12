-- Add working days and manual order control to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN working_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
ADD COLUMN accepts_orders_override boolean DEFAULT NULL;

COMMENT ON COLUMN public.restaurants.working_days IS 'Days of the week the restaurant is open';
COMMENT ON COLUMN public.restaurants.accepts_orders_override IS 'Manual override for accepting orders. NULL = auto (based on schedule), true = always accept, false = never accept';