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

const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL') ?? 'https://asaas.com';
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

if (!ASAAS_API_KEY) {
  console.error('ASAAS_API_KEY not configured in environment');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: CreatePaymentRequest = await req.json();

    // Basic validation
    if (!requestData || !requestData.type || !requestData.amount || !requestData.paymentMethod) {
      return new Response(JSON.stringify({ error: 'Invalid request payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating ASAAS payment:', {
      type: requestData.type,
      amount: requestData.amount,
      paymentMethod: requestData.paymentMethod,
    });

    // Helper for requests to Asaas
    async function asaasFetch(path: string, options: RequestInit = {}) {
      const url = `${ASAAS_BASE_URL.replace(/\/$/, '')}${path}`;
      const headers = {
        'access_token': ASAAS_API_KEY!,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      return fetch(url, { ...options, headers });
    }

    // Criar ou buscar cliente no ASAAS
    let customerId: string | undefined;

    // Tentar buscar cliente existente por CPF/CNPJ
    if (requestData.customerCpfCnpj) {
      const searchResponse = await asaasFetch(`/api/v3/customers?cpfCnpj=${encodeURIComponent(requestData.customerCpfCnpj)}`, {
        method: 'GET',
      });

      const searchData = await searchResponse.json();
      if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
        console.log('Customer found by cpf/cnpj:', customerId);
      } else {
        // Criar novo cliente com cpf/cnpj
        const customerResponse = await asaasFetch('/api/v3/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: requestData.customerName,
            cpfCnpj: requestData.customerCpfCnpj,
            email: requestData.customerEmail,
            mobilePhone: requestData.customerPhone,
          }),
        });

        const customerData = await customerResponse.json();
        if (!customerResponse.ok) {
          console.error('Error creating customer (with cpf):', customerData);
          throw new Error(`Failed to create customer: ${JSON.stringify(customerData.errors || customerData)}`);
        }
        customerId = customerData.id;
        console.log('Customer created (with cpf):', customerId);
      }
    } else if (requestData.customerEmail) {
      // Tentar buscar por email (fallback)
      try {
        const searchResponse = await asaasFetch(`/api/v3/customers?email=${encodeURIComponent(requestData.customerEmail)}`, {
          method: 'GET',
        });
        const searchData = await searchResponse.json();
        if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id;
          console.log('Customer found by email:', customerId);
        }
      } catch (err) {
        console.warn('Error searching customer by email (ignored):', err);
      }
    }

    // Se ainda não temos customerId, criar sem cpf/cnpj
    if (!customerId) {
      const customerResponse = await asaasFetch('/api/v3/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: requestData.customerName,
          email: requestData.customerEmail,
          mobilePhone: requestData.customerPhone,
        }),
      });

      const customerData = await customerResponse.json();
      if (!customerResponse.ok) {
        console.error('Error creating customer (no cpf):', customerData);
        throw new Error(`Failed to create customer: ${JSON.stringify(customerData.errors || customerData)}`);
      }
      customerId = customerData.id;
      console.log('Customer created (no cpf):', customerId);
    }

    // Montar cobrança
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Map paymentMethod for Asaas expected billingType if needed
    let billingType = requestData.paymentMethod; // keep original values; Asaas supports PIX, BOLETO, CREDIT_CARD
    if (billingType === 'DEBIT_CARD') billingType = 'CREDIT_CARD'; // Asaas treats card payments as credit card in many flows

    const paymentBody: any = {
      customer: customerId,
      billingType,
      value: requestData.amount,
      dueDate: dueDateStr,
      description:
        requestData.type === 'order'
          ? `Pedido #${requestData.orderId ? requestData.orderId.slice(0, 8) : 'N/A'}`
          : `Assinatura de Plano`,
    };

    // Se for cartão, adicionar dados
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

    // Criar pagamento
    const paymentResponse = await asaasFetch('/api/v3/payments', {
      method: 'POST',
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
      const { error: insertError } = await supabaseClient.from('order_payments').insert({
        order_id: requestData.orderId,
        asaas_payment_id: paymentData.id,
        asaas_invoice_url: paymentData.invoiceUrl ?? paymentData.invoice_url ?? null,
        amount: requestData.amount,
        payment_method: (requestData.paymentMethod || '').toLowerCase(),
        status: paymentData.status ?? 'pending',
        pix_qr_code: paymentData.encodedImage ?? null,
        pix_qr_code_url: paymentData.invoiceUrl ?? null,
        expires_at: paymentData.dueDate ?? null,
      });

      if (insertError) {
        console.error('Error saving order payment:', insertError);
        throw insertError;
      }
    } else {
      const { error: insertError } = await supabaseClient.from('restaurant_subscription_payments').insert({
        restaurant_id: requestData.restaurantId,
        subscription_plan_id: requestData.subscriptionPlanId,
        asaas_payment_id: paymentData.id,
        asaas_invoice_url: paymentData.invoiceUrl ?? paymentData.invoice_url ?? null,
        amount: requestData.amount,
        payment_method: (requestData.paymentMethod || '').toLowerCase(),
        status: paymentData.status ?? 'pending',
        pix_qr_code: paymentData.encodedImage ?? null,
        pix_qr_code_url: paymentData.invoiceUrl ?? null,
        boleto_url: paymentData.bankSlipUrl ?? paymentData.bankSlipUrl ?? null,
        expires_at: paymentData.dueDate ?? null,
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
        invoiceUrl: paymentData.invoiceUrl ?? paymentData.invoice_url ?? null,
        pixQrCode: paymentData.encodedImage ?? null,
        pixCopyPaste: paymentData.payload ?? null,
        boletoUrl: paymentData.bankSlipUrl ?? paymentData.bankSlipUrl ?? null,
        status: paymentData.status ?? null,
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
        details: (error as any) || null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
