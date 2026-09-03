-- 20240118_harden_admin_authorization.sql
-- Add is_admin column to profiles and secure is_admin function

-- Add is_admin column if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Replace insecure is_admin function with secure version
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.is_admin
      FROM public.profiles p
      WHERE p.id = auth.uid()
    ),
    false
  );
$$;
