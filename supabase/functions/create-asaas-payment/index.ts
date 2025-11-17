import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  type: 'order' | 'subscription';
  orderId?: string;
  restaurantId?: string;
  subscriptionPlanId?: string;
  amount: number;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
  customerName: string;
  customerCpfCnpj?: string;
  customerEmail?: string;
  customerPhone?: string;
  creditCardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: CreatePaymentRequest = await req.json();
    console.log('Creating ASAAS payment:', { 
      type: requestData.type, 
      amount: requestData.amount,
      paymentMethod: requestData.paymentMethod 
    });

    // Criar ou buscar cliente no ASAAS
    let customerId: string;
    
    // Tentar buscar cliente existente por CPF/CNPJ ou email
    if (requestData.customerCpfCnpj) {
      const searchResponse = await fetch(
        `https://sandbox.asaas.com/api/v3/customers?cpfCnpj=${requestData.customerCpfCnpj}`,
        {
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const searchData = await searchResponse.json();
      
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
        console.log('Customer found:', customerId);
      } else {
        // Criar novo cliente
        const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
          method: 'POST',
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: requestData.customerName,
            cpfCnpj: requestData.customerCpfCnpj,
            email: requestData.customerEmail,
            mobilePhone: requestData.customerPhone,
          }),
        });

        const customerData = await customerResponse.json();
        if (!customerResponse.ok) {
          console.error('Error creating customer:', customerData);
          throw new Error(`Failed to create customer: ${JSON.stringify(customerData.errors || customerData)}`);
        }
        
        customerId = customerData.id;
        console.log('Customer created:', customerId);
      }
    } else {
      // Criar cliente sem CPF/CNPJ
      const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: requestData.customerName,
          email: requestData.customerEmail,
          mobilePhone: requestData.customerPhone,
        }),
      });

      const customerData = await customerResponse.json();
      if (!customerResponse.ok) {
        console.error('Error creating customer:', customerData);
        throw new Error(`Failed to create customer: ${JSON.stringify(customerData.errors || customerData)}`);
      }
      
      customerId = customerData.id;
      console.log('Customer created:', customerId);
    }

    // Criar cobrança no ASAAS
    const paymentBody: any = {
      customer: customerId,
      billingType: requestData.paymentMethod,
      value: requestData.amount,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24h
      description: requestData.type === 'order' 
        ? `Pedido #${requestData.orderId?.slice(0, 8)}`
        : `Assinatura de Plano`,
    };

    // Se for cartão de crédito ou débito, adicionar dados do cartão
    if (requestData.paymentMethod === 'CREDIT_CARD' || requestData.paymentMethod === 'DEBIT_CARD') {
      if (!requestData.creditCardData) {
        throw new Error('Credit card data required for card payments');
      }

      paymentBody.creditCard = {
        holderName: requestData.creditCardData.holderName,
        number: requestData.creditCardData.number,
        expiryMonth: requestData.creditCardData.expiryMonth,
        expiryYear: requestData.creditCardData.expiryYear,
        ccv: requestData.creditCardData.ccv,
      };
      paymentBody.creditCardHolderInfo = {
        name: requestData.customerName,
        email: requestData.customerEmail,
        cpfCnpj: requestData.customerCpfCnpj,
        phone: requestData.customerPhone,
      };
    }

    const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
    });

    const paymentData = await paymentResponse.json();
    
    if (!paymentResponse.ok) {
      console.error('Error creating payment:', paymentData);
      throw new Error(`Failed to create payment: ${JSON.stringify(paymentData.errors || paymentData)}`);
    }

    console.log('Payment created:', paymentData.id);

    // Salvar no banco de dados
    if (requestData.type === 'order') {
      const { error: insertError } = await supabaseClient
        .from('order_payments')
        .insert({
          order_id: requestData.orderId,
          asaas_payment_id: paymentData.id,
          asaas_invoice_url: paymentData.invoiceUrl,
          amount: requestData.amount,
          payment_method: requestData.paymentMethod.toLowerCase(),
          status: 'pending',
          pix_qr_code: paymentData.encodedImage,
          pix_qr_code_url: paymentData.invoiceUrl,
          expires_at: paymentData.dueDate,
        });

      if (insertError) {
        console.error('Error saving order payment:', insertError);
        throw insertError;
      }
    } else {
      const { error: insertError } = await supabaseClient
        .from('restaurant_subscription_payments')
        .insert({
          restaurant_id: requestData.restaurantId,
          subscription_plan_id: requestData.subscriptionPlanId,
          asaas_payment_id: paymentData.id,
          asaas_invoice_url: paymentData.invoiceUrl,
          amount: requestData.amount,
          payment_method: requestData.paymentMethod.toLowerCase(),
          status: 'pending',
          pix_qr_code: paymentData.encodedImage,
          pix_qr_code_url: paymentData.invoiceUrl,
          boleto_url: paymentData.bankSlipUrl,
          expires_at: paymentData.dueDate,
        });

      if (insertError) {
        console.error('Error saving subscription payment:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        invoiceUrl: paymentData.invoiceUrl,
        pixQrCode: paymentData.encodedImage,
        pixCopyPaste: paymentData.payload,
        boletoUrl: paymentData.bankSlipUrl,
        status: paymentData.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-asaas-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
