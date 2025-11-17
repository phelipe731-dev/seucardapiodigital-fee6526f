-- Remover campo de token API e adicionar campos para Evolution API
ALTER TABLE public.restaurants
DROP COLUMN IF EXISTS whatsapp_api_token;

ALTER TABLE public.restaurants
ADD COLUMN whatsapp_evolution_url TEXT,
ADD COLUMN whatsapp_evolution_instance TEXT,
ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false,
ADD COLUMN whatsapp_phone TEXT;

COMMENT ON COLUMN public.restaurants.whatsapp_evolution_url IS 'URL do servidor Evolution API para conexão WhatsApp via QR Code';
COMMENT ON COLUMN public.restaurants.whatsapp_evolution_instance IS 'Nome da instância no Evolution API';
COMMENT ON COLUMN public.restaurants.whatsapp_connected IS 'Status da conexão WhatsApp';
COMMENT ON COLUMN public.restaurants.whatsapp_phone IS 'Número do WhatsApp conectado';