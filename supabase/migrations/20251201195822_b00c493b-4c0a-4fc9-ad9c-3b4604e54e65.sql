-- Add RLS policies for restaurant owners to manage waiters
CREATE POLICY "Restaurant owners can create waiter roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'restaurant_owner') 
  AND role = 'waiter'
);

CREATE POLICY "Restaurant owners can delete waiter roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'restaurant_owner') 
  AND role = 'waiter'
);

CREATE POLICY "Restaurant owners can view waiter roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'restaurant_owner') 
  AND role = 'waiter'
);