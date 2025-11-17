import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  orderId: string;
  restaurantId: string;
  newStatus: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, restaurantId, newStatus }: NotificationRequest = await req.json();
    
    console.log('Notification request:', { orderId, restaurantId, newStatus });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar informações do restaurante e token WhatsApp
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, whatsapp_api_token')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações do pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order.customer_phone) {
      console.log('No phone number for customer');
      return new Response(
        JSON.stringify({ message: 'Cliente sem telefone cadastrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o token do WhatsApp está configurado
    if (!restaurant.whatsapp_api_token) {
      console.log('WhatsApp API token not configured');
      return new Response(
        JSON.stringify({ message: 'Token do WhatsApp não configurado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mapear status para mensagem amigável
    const statusMessages: Record<string, string> = {
      'pending': '⏳ Seu pedido foi recebido e está aguardando confirmação.',
      'confirmed': '✅ Seu pedido foi confirmado e será preparado em breve!',
      'preparing': '👨‍🍳 Seu pedido está sendo preparado com carinho!',
      'ready': '🎉 Seu pedido está pronto para retirada!',
      'out_for_delivery': '🚚 Seu pedido saiu para entrega e chegará em breve!',
      'completed': '✅ Pedido concluído! Obrigado pela preferência!',
      'cancelled': '❌ Seu pedido foi cancelado. Entre em contato conosco para mais informações.'
    };

    const statusMessage = statusMessages[newStatus] || `Status atualizado: ${newStatus}`;
    
    // Montar mensagem
    const message = `*${restaurant.name}*\n\n${statusMessage}\n\n*Pedido:* #${orderId.substring(0, 8)}\n*Cliente:* ${order.customer_name}\n*Total:* R$ ${order.total_amount.toFixed(2)}\n\nAcompanhe seu pedido: ${supabaseUrl.replace('supabase.co', 'lovable.app')}/pedido?id=${orderId}`;

    // Enviar mensagem via WhatsApp Business API
    // Usando formato genérico - ajustar conforme provider (Twilio, 360Dialog, etc)
    const whatsappResponse = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${restaurant.whatsapp_api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: order.customer_phone.replace(/\D/g, ''),
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error('WhatsApp API error:', errorText);
      throw new Error(`Erro ao enviar WhatsApp: ${errorText}`);
    }

    const result = await whatsappResponse.json();
    console.log('WhatsApp sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Notificação enviada com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});