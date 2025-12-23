import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FloatingCartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export function FloatingCartButton({ itemCount, total, onClick }: FloatingCartButtonProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <Button
        onClick={onClick}
        className="w-full h-14 shadow-xl rounded-xl flex items-center justify-between px-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-background text-primary"
            >
              {itemCount}
            </Badge>
          </div>
          <span className="font-medium">Ver carrinho</span>
        </div>
        <span className="font-bold">
          R$ {total.toFixed(2).replace('.', ',')}
        </span>
      </Button>
    </div>
  );
}
