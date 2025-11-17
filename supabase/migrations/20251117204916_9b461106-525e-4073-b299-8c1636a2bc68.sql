-- Add policy to allow anyone to view orders by ID (for tracking)
CREATE POLICY "Anyone can view order by id"
ON public.orders
FOR SELECT
USING (true);