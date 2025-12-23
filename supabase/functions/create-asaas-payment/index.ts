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

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

// Auto-detect environment from token (prod vs sandbox). Can be overridden via ASAAS_BASE_URL.
const inferredOrigin =
  ASAAS_API_KEY && ASAAS_API_KEY.includes('_prod_')
    ? 'https://api.asaas.com'
    : 'https://sandbox.asaas.com';

const ASAAS_ORIGIN = Deno.env.get('ASAAS_BASE_URL') ?? inferredOrigin;

// Production uses /v3; sandbox commonly uses /api/v3
const ASAAS_API_PREFIX = ASAAS_ORIGIN.includes('sandbox.asaas.com') ? '/api/v3' : '/v3';

if (!ASAAS_API_KEY) {
  console.error('ASAAS_API_KEY not configured in environment');
}

type AsaasRequestResult<T> = {
  status: number;
  data: T;
  raw: string;
};

async function asaasRequest<T>(path: string, options: RequestInit = {}): Promise<AsaasRequestResult<T>> {
  const origin = ASAAS_ORIGIN.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${origin}${ASAAS_API_PREFIX}${normalizedPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      access_token: ASAAS_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await res.text();
  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = { raw };
  }

  if (!res.ok) {
    console.error('Asaas API error response:', { url, status: res.status, body: json });
    const message =
      json?.errors
        ? JSON.stringify(json.errors)
        : typeof json?.raw === 'string'
          ? json.raw
          : raw;
    throw new Error(`Asaas API error (${res.status}): ${message}`);
  }

  return { status: res.status, data: json as T, raw };
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
    if (!requestData?.type || !requestData?.amount || !requestData?.paymentMethod || !requestData?.customerName) {
      return new Response(JSON.stringify({ error: 'Invalid request payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestData.type === 'order' && !requestData.orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required for order payments' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestData.type === 'subscription' && (!requestData.restaurantId || !requestData.subscriptionPlanId)) {
      return new Response(
        JSON.stringify({ error: 'restaurantId and subscriptionPlanId are required for subscription payments' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating Asaas payment:', {
      type: requestData.type,
      amount: requestData.amount,
      paymentMethod: requestData.paymentMethod,
      origin: ASAAS_ORIGIN,
      prefix: ASAAS_API_PREFIX,
    });

    // Criar ou buscar cliente no Asaas
    let customerId: string | undefined;

    const findCustomerId = async (query: string) => {
      const { data } = await asaasRequest<{ data: Array<{ id: string }> }>(`/customers${query}`, {
        method: 'GET',
      });
      return data?.data?.[0]?.id;
    };

    const createCustomerId = async (payload: Record<string, unknown>) => {
      const { data } = await asaasRequest<{ id: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data?.id;
    };

    // Tentar buscar cliente existente por CPF/CNPJ
    if (requestData.customerCpfCnpj) {
      customerId = await findCustomerId(`?cpfCnpj=${encodeURIComponent(requestData.customerCpfCnpj)}`);
      if (customerId) {
        console.log('Customer found by cpf/cnpj:', customerId);
      }

      if (!customerId) {
        customerId = await createCustomerId({
          name: requestData.customerName,
          cpfCnpj: requestData.customerCpfCnpj,
          email: requestData.customerEmail,
          mobilePhone: requestData.customerPhone,
        });
        console.log('Customer created (with cpf):', customerId);
      }
    } else if (requestData.customerEmail) {
      // Tentar buscar por email (fallback)
      try {
        customerId = await findCustomerId(`?email=${encodeURIComponent(requestData.customerEmail)}`);
        if (customerId) {
          console.log('Customer found by email:', customerId);
        }
      } catch (err) {
        console.warn('Error searching customer by email (ignored):', err);
      }
    }

    // Se ainda não temos customerId, criar sem cpf/cnpj
    if (!customerId) {
      customerId = await createCustomerId({
        name: requestData.customerName,
        email: requestData.customerEmail,
        mobilePhone: requestData.customerPhone,
      });
      console.log('Customer created (no cpf):', customerId);
    }

    if (!customerId) {
      throw new Error('Failed to resolve Asaas customer id');
    }

    // Montar cobrança
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Map paymentMethod for Asaas expected billingType if needed
    let billingType = requestData.paymentMethod;
    if (billingType === 'DEBIT_CARD') billingType = 'CREDIT_CARD';

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
    const { data: paymentData } = await asaasRequest<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentBody),
    });

    if (!paymentData?.id) {
      console.error('Payment response missing id:', paymentData);
      throw new Error('Asaas payment response missing id');
    }

    console.log('Payment created:', paymentData.id);

    let pixQrCodeData: { encodedImage: string; payload: string; expirationDate?: string } | null = null;

    if (billingType === 'PIX') {
      const { data: qrData } = await asaasRequest<{ encodedImage: string; payload: string; expirationDate?: string }>(
        `/payments/${paymentData.id}/pixQrCode`,
        { method: 'GET' }
      );
      pixQrCodeData = qrData;
    }

    const invoiceUrl = paymentData.invoiceUrl ?? paymentData.invoice_url ?? null;
    const boletoUrl = paymentData.bankSlipUrl ?? null;

    // Salvar no banco de dados
    if (requestData.type === 'order') {
      const { error: insertError } = await supabaseClient.from('order_payments').insert({
        order_id: requestData.orderId,
        asaas_payment_id: paymentData.id,
        asaas_invoice_url: invoiceUrl,
        amount: requestData.amount,
        payment_method: (requestData.paymentMethod || '').toLowerCase(),
        status: paymentData.status ?? 'pending',
        pix_qr_code: pixQrCodeData?.encodedImage ?? null,
        pix_qr_code_url: invoiceUrl,
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
        asaas_invoice_url: invoiceUrl,
        amount: requestData.amount,
        payment_method: (requestData.paymentMethod || '').toLowerCase(),
        status: paymentData.status ?? 'pending',
        pix_qr_code: pixQrCodeData?.encodedImage ?? null,
        pix_qr_code_url: invoiceUrl,
        boleto_url: boletoUrl,
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
        invoiceUrl,
        pixQrCode: pixQrCodeData?.encodedImage ?? null,
        pixCopyPaste: pixQrCodeData?.payload ?? null,
        boletoUrl,
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
