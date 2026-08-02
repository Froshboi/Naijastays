-- Add promotion metadata fields to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS promoted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_plan TEXT;

-- Create promotion payment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_payment_status') THEN
    CREATE TYPE public.promotion_payment_status AS ENUM ('pending', 'confirmed', 'failed');
  END IF;
END $$;

-- Create promotion payments table
CREATE TABLE IF NOT EXISTS public.promotion_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,
  amount_naira BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT UNIQUE,
  screenshot_url TEXT,
  status public.promotion_payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promotion_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert promotion payments" ON public.promotion_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own promotion payments" ON public.promotion_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all promotion payments" ON public.promotion_payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update promotion payment status" ON public.promotion_payments FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create landlord application status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'landlord_application_status') THEN
    CREATE TYPE public.landlord_application_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Create landlord applications table
CREATE TABLE IF NOT EXISTS public.landlord_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_requested public.app_role NOT NULL DEFAULT 'landlord',
  status public.landlord_application_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.landlord_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit landlord applications" ON public.landlord_applications FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can view own landlord applications" ON public.landlord_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all landlord applications" ON public.landlord_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update landlord application status" ON public.landlord_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage roles for other users
CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Allow admin promotion actions on properties
CREATE POLICY "Admins can update property promotions" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger for landlord applications
CREATE TRIGGER update_landlord_applications_updated_at BEFORE UPDATE ON public.landlord_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
