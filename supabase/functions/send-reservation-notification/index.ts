import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReservationNotificationRequest {
  reservationId: string;
  restaurantId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId, restaurantId }: ReservationNotificationRequest = await req.json();
    
    console.log('Reservation notification request:', { reservationId, restaurantId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar informações do restaurante e configuração WhatsApp
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, whatsapp, whatsapp_evolution_url, whatsapp_evolution_instance, whatsapp_connected')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações da reserva
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('customer_name, customer_phone, reservation_date, reservation_time, party_size, confirmation_code, notes')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('Reservation not found:', reservationError);
      return new Response(
        JSON.stringify({ error: 'Reserva não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o WhatsApp está conectado
    if (!restaurant.whatsapp_connected || !restaurant.whatsapp_evolution_url || !restaurant.whatsapp_evolution_instance) {
      console.log('WhatsApp not connected - notification will not be sent');
      return new Response(
        JSON.stringify({ message: 'WhatsApp não conectado - notificação não enviada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar data para exibição
    const dateParts = reservation.reservation_date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    // Montar mensagem para o restaurante (WhatsApp do negócio)
    const restaurantMessage = `🔔 *NOVA RESERVA RECEBIDA*\n\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `🕐 *Horário:* ${reservation.reservation_time}\n` +
      `👥 *Pessoas:* ${reservation.party_size}\n` +
      `👤 *Cliente:* ${reservation.customer_name}\n` +
      `📱 *Telefone:* ${reservation.customer_phone}\n` +
      `🔑 *Código:* ${reservation.confirmation_code}\n` +
      (reservation.notes ? `📝 *Observações:* ${reservation.notes}\n` : '') +
      `\n⚠️ *Aguardando confirmação no painel administrativo*`;

    // Enviar notificação para o WhatsApp do restaurante
    const restaurantPhone = restaurant.whatsapp.replace(/\D/g, '');
    const whatsappResponse = await fetch(
      `${restaurant.whatsapp_evolution_url}/message/sendText/${restaurant.whatsapp_evolution_instance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: `${restaurantPhone}@s.whatsapp.net`,
          text: restaurantMessage
        })
      }
    );

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error('WhatsApp API error:', errorText);
      throw new Error(`Erro ao enviar WhatsApp: ${errorText}`);
    }

    const result = await whatsappResponse.json();
    console.log('Restaurant notification sent successfully:', result);

    // Enviar mensagem de confirmação para o cliente
    if (reservation.customer_phone) {
      const customerPhone = reservation.customer_phone.replace(/\D/g, '');
      const customerMessage = `✅ *Reserva Solicitada - ${restaurant.name}*\n\n` +
        `Olá ${reservation.customer_name}! Sua reserva foi registrada.\n\n` +
        `📅 *Data:* ${formattedDate}\n` +
        `🕐 *Horário:* ${reservation.reservation_time}\n` +
        `👥 *Pessoas:* ${reservation.party_size}\n` +
        `🔑 *Código de Confirmação:* ${reservation.confirmation_code}\n\n` +
        `⏳ Aguardando confirmação do restaurante.\n` +
        `Guarde este código para apresentar na chegada!`;

      const customerWhatsappResponse = await fetch(
        `${restaurant.whatsapp_evolution_url}/message/sendText/${restaurant.whatsapp_evolution_instance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: `${customerPhone}@s.whatsapp.net`,
            text: customerMessage
          })
        }
      );

      if (customerWhatsappResponse.ok) {
        console.log('Customer notification sent successfully');
      } else {
        console.error('Failed to send customer notification');
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notificações enviadas com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-reservation-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
