import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    
    // Verificar token do webhook (segurança)
    const webhookToken = req.headers.get('asaas-access-token');
    if (webhookToken !== asaasApiKey) {
      console.error('Invalid webhook token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData = await req.json();
    console.log('Received webhook:', webhookData.event, webhookData.payment?.id);

    const paymentId = webhookData.payment?.id;
    const status = webhookData.payment?.status;

    if (!paymentId) {
      throw new Error('Payment ID not found in webhook');
    }

    // Mapear status do ASAAS para nosso sistema
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'RECEIVED': 'received',
      'CONFIRMED': 'confirmed',
      'OVERDUE': 'overdue',
      'REFUNDED': 'refunded',
      'RECEIVED_IN_CASH': 'received',
      'REFUND_REQUESTED': 'refund_requested',
    };

    const mappedStatus = statusMap[status] || 'pending';

    // Atualizar pagamento de pedido
    const { data: orderPayment } = await supabaseClient
      .from('order_payments')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (orderPayment) {
      const updateData: any = {
        status: mappedStatus,
      };

      if (mappedStatus === 'received' || mappedStatus === 'confirmed') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from('order_payments')
        .update(updateData)
        .eq('asaas_payment_id', paymentId);

      if (updateError) {
        console.error('Error updating order payment:', updateError);
        throw updateError;
      }

      // Atualizar status do pedido se pagamento confirmado
      if (mappedStatus === 'received' || mappedStatus === 'confirmed') {
        await supabaseClient
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderPayment.order_id);
      }

      console.log('Order payment updated:', paymentId, mappedStatus);
    }

    // Atualizar pagamento de assinatura
    const { data: subscriptionPayment } = await supabaseClient
      .from('restaurant_subscription_payments')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (subscriptionPayment) {
      const updateData: any = {
        status: mappedStatus,
      };

      if (mappedStatus === 'received' || mappedStatus === 'confirmed') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from('restaurant_subscription_payments')
        .update(updateData)
        .eq('asaas_payment_id', paymentId);

      if (updateError) {
        console.error('Error updating subscription payment:', updateError);
        throw updateError;
      }

      console.log('Subscription payment updated:', paymentId, mappedStatus);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in asaas-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
