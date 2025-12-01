-- Allow waiters to manage open tabs
CREATE POLICY "Waiters can manage open tabs"
ON public.open_tabs
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'waiter')
)
WITH CHECK (
  has_role(auth.uid(), 'waiter')
);

-- Allow waiters to create and view orders
CREATE POLICY "Waiters can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'waiter')
);

CREATE POLICY "Waiters can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'waiter')
);

-- Allow waiters to create order items
CREATE POLICY "Waiters can create order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.waiter_id = auth.uid()
  )
);

CREATE POLICY "Waiters can view order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.waiter_id = auth.uid()
  )
);