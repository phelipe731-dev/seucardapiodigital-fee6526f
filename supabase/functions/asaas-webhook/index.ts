import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 ASAAS Webhook triggered");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data = await req.json();
    console.log("📩 Webhook payload:", JSON.stringify(data, null, 2));

    const eventType = data.event ?? data.type;
    const payment = data.payment;
    const paymentId = payment?.id;
    const paymentStatus = payment?.status;

    if (!paymentId || !paymentStatus) {
      console.error("❌ Payment ID/status missing in payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const isPaid = mappedStatus === "received" || mappedStatus === "confirmed";
    const paidAt = isPaid ? new Date().toISOString() : null;

    console.log(`🔄 Processing payment ${paymentId} → ${mappedStatus} (event: ${eventType})`);

    // Try to update ORDER_PAYMENTS
    const { data: orderPayment } = await supabase
      .from("order_payments")
      .select("*")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (orderPayment) {
      console.log("🧾 Updating order payment...");

      const { error } = await supabase
        .from("order_payments")
        .update({
          status: mappedStatus,
          paid_at: paidAt,
        })
        .eq("asaas_payment_id", paymentId);

      if (error) {
        console.error("❌ Error updating order_payments:", error);
        throw error;
      }

      if (isPaid) {
        await supabase
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", orderPayment.order_id);
        console.log(`✅ Order ${orderPayment.order_id} confirmed`);
      }
    }

    // Try to update RESTAURANT_SUBSCRIPTION_PAYMENTS
    const { data: subscriptionPayment } = await supabase
      .from("restaurant_subscription_payments")
      .select("*, subscription_plans(*)")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (subscriptionPayment) {
      console.log("🧾 Updating subscription payment...");

      const { error } = await supabase
        .from("restaurant_subscription_payments")
        .update({
          status: mappedStatus,
          paid_at: paidAt,
        })
        .eq("asaas_payment_id", paymentId);

      if (error) {
        console.error("❌ Error updating restaurant_subscription_payments:", error);
        throw error;
      }

      // If payment confirmed, activate user subscription
      if (isPaid) {
        console.log("🎉 Payment confirmed! Activating subscription...");

        // Get restaurant owner
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("owner_id")
          .eq("id", subscriptionPayment.restaurant_id)
          .single();

        if (restaurant) {
          const plan = subscriptionPayment.subscription_plans;
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + (plan?.duration_days || 30));

          // Deactivate any existing subscriptions for this user
          await supabase
            .from("user_subscriptions")
            .update({ is_active: false })
            .eq("user_id", restaurant.owner_id)
            .eq("is_active", true);

          // Create new active subscription
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .insert({
              user_id: restaurant.owner_id,
              plan_id: subscriptionPayment.subscription_plan_id,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              is_active: true,
            });

          if (subError) {
            console.error("❌ Error creating user_subscription:", subError);
            throw subError;
          }

          console.log(`✅ Subscription activated for user ${restaurant.owner_id} until ${endDate.toISOString()}`);
        }
      }
    }

    console.log("✅ Webhook processed successfully");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔥 WEBHOOK ERROR:", error);
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
