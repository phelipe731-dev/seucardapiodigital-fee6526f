import { Star, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface DailyDealsSectionProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  disabled?: boolean;
}

export function DailyDealsSection({ products, onAddProduct, disabled }: DailyDealsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-0.5">
        <div className="bg-background rounded-2xl p-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
            <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              PROMOÇÃO DO DIA
            </h2>
            <Sparkles className="h-5 w-5 text-orange-500" />
          </div>
          
          {/* Products */}
          <div className="space-y-3">
            {products.map((product) => (
              <div 
                key={product.id}
                className="flex gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800"
              >
                {/* Image */}
                {product.image_url && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-[10px] px-1.5 py-0.5">
                      🔥
                    </Badge>
                  </div>
                )}
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-primary">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onAddProduct(product)}
                      disabled={disabled || !product.is_available}
                      className="h-8 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
