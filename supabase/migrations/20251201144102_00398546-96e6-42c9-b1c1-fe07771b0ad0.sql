ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printed_at timestamp with time zone;

CREATE TABLE public.printer_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
  printer_ip text NOT NULL,
  printer_port integer DEFAULT 9100 NOT NULL,
  save_pdf boolean DEFAULT true,
  pdf_output_dir text,
  print_retries integer DEFAULT 3,
  print_timeout_ms integer DEFAULT 10000,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.printer_configs ENABLE ROW LEVEL SECURITY;