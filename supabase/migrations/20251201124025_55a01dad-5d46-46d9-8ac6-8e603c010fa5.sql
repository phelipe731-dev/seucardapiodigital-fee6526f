-- Fix function search_path for has_role function
-- The function already has SET search_path TO 'public' so we need to ensure it's properly set

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;