-- Adicionar campo para armazenar token da API do WhatsApp
ALTER TABLE public.restaurants
ADD COLUMN whatsapp_api_token TEXT;

COMMENT ON COLUMN public.restaurants.whatsapp_api_token IS 'Token da API do WhatsApp Business para envio de notificações automáticas';