import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// INICIAR SERVIDOR
serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 ASAAS Webhook triggered");

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      console.error("🚨 ASAAS_API_KEY faltando no ambiente");
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔐 VALIDAÇÃO DE SEGURANÇA
    const webhookToken = req.headers.get("asaas-access-token");
    if (webhookToken !== ASAAS_API_KEY) {
      console.error("🚫 Invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CLIENTE SUPABASE
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 🔍 RECEBE PAYLOAD DO ASAAS
    const data = await req.json();
    console.log("📩 Webhook recebido:", data);

    const eventType = data.event ?? data.type ?? data?.payment?.status;
    const payment = data.payment;
    const paymentId = payment?.id;
    const paymentStatus = payment?.status;

    if (!paymentId || !paymentStatus) {
      console.error("❌ Payment ID/status ausentes");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 🎯 MAPEAMENTO DE STATUS
    const statusMap: Record<string, string> = {
      PENDING: "pending",
      CONFIRMED: "confirmed",
      RECEIVED: "received",
      RECEIVED_IN_CASH: "received",
      OVERDUE: "overdue",
      REFUNDED: "refunded",
      REFUND_REQUESTED: "refund_requested",
      CANCELLED: "cancelled",
    };

    const mappedStatus = statusMap[paymentStatus] ?? "pending";

    console.log(
      `🔄 Atualizando pagamento ${paymentId} → ${mappedStatus} (event: ${eventType})`
    );

    // 🛡️ IDEMPOTÊNCIA → EVITA DUPLICAR ATUALIZAÇÕES
    const paidAt =
      mappedStatus === "received" || mappedStatus === "confirmed"
        ? new Date().toISOString()
        : null;

    // 🔎 TENTA ATUALIZAR ORDER_PAYMENTS
    const { data: orderPayment } = await supabase
      .from("order_payments")
      .select("*")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (orderPayment) {
      console.log("🧾 Atualizando pagamento de pedido...");

      const { error } = await supabase
        .from("order_payments")
        .update({
          status: mappedStatus,
          paid_at: paidAt,
        })
        .eq("asaas_payment_id", paymentId);

      if (error) {
        console.error("❌ Erro atualizando order_payments:", error);
        throw error;
      }

      // Atualiza pedido quando pago
      if (paidAt) {
        await supabase
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", orderPayment.order_id);
      }
    }

    // 🔎 TENTA ATUALIZAR RESTAURANT_SUBSCRIPTION_PAYMENTS
    const { data: subscriptionPayment } = await supabase
      .from("restaurant_subscription_payments")
      .select("*")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (subscriptionPayment) {
      console.log("🧾 Atualizando pagamento de assinatura...");

      const { error } = await supabase
        .from("restaurant_subscription_payments")
        .update({
          status: mappedStatus,
          paid_at: paidAt,
        })
        .eq("asaas_payment_id", paymentId);

      if (error) {
        console.error(
          "❌ Erro atualizando restaurant_subscription_payments:",
          error
        );
        throw error;
      }
    }

    console.log("✅ Webhook concluído com sucesso");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔥 ERRO NO WEBHOOK:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
