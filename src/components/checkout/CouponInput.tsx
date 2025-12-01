import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tag, Check, X } from "lucide-react";

interface CouponInputProps {
  restaurantId: string;
  subtotal: number;
  onCouponApplied: (discount: number, couponId: string, couponCode: string) => void;
  onCouponRemoved: () => void;
  appliedCouponCode?: string;
}

export default function CouponInput({
  restaurantId,
  subtotal,
  onCouponApplied,
  onCouponRemoved,
  appliedCouponCode,
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);

  const validateAndApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Digite um código de cupom");
      return;
    }

    setLoading(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (error || !coupon) {
        toast.error("Cupom inválido ou expirado");
        return;
      }

      // Verificar validade de datas
      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        toast.error("Este cupom ainda não está disponível");
        return;
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        toast.error("Este cupom já expirou");
        return;
      }

      // Verificar limite de usos
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return;
      }

      // Verificar valor mínimo do pedido
      if (subtotal < coupon.min_order) {
        toast.error(`Pedido mínimo de R$ ${coupon.min_order.toFixed(2)} para usar este cupom`);
        return;
      }

      // Calcular desconto
      let discount = 0;
      if (coupon.type === "percentage") {
        discount = (subtotal * coupon.value) / 100;
      } else {
        discount = coupon.value;
      }

      // Garantir que o desconto não seja maior que o subtotal
      discount = Math.min(discount, subtotal);

      onCouponApplied(discount, coupon.id, coupon.code);
      toast.success(`Cupom "${coupon.code}" aplicado! Desconto de R$ ${discount.toFixed(2)}`);
      setCouponCode("");
    } catch (error: any) {
      toast.error("Erro ao validar cupom: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    onCouponRemoved();
    toast.success("Cupom removido");
  };

  return (
    <div className="space-y-2">
      {appliedCouponCode ? (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Cupom "{appliedCouponCode}" aplicado</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={removeCoupon}
            className="h-auto p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && validateAndApplyCoupon()}
              className="pl-10"
              maxLength={20}
            />
          </div>
          <Button
            onClick={validateAndApplyCoupon}
            disabled={loading || !couponCode.trim()}
            variant="outline"
          >
            {loading ? "Validando..." : "Aplicar"}
          </Button>
        </div>
      )}
    </div>
  );
}