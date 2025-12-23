import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  disabled?: boolean;
}

export function ProductCard({ product, onAdd, disabled }: ProductCardProps) {
  const isUnavailable = !product.is_available;

  return (
    <div 
      className={cn(
        "flex gap-2 p-2 border-b last:border-b-0 transition-colors",
        isUnavailable ? "opacity-60" : "hover:bg-muted/50"
      )}
    >
      {/* Product Image */}
      <div className="relative flex-shrink-0">
        {product.image_url ? (
          <div className="relative">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-md object-cover"
            />
            {isUnavailable && (
              <div className="absolute inset-0 bg-background/80 rounded-md flex items-center justify-center">
                <span className="text-[10px] font-medium text-muted-foreground">Esgotado</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
            <span className="text-xl">🍽️</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-medium text-foreground text-xs leading-tight line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-primary">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          {!isUnavailable && (
            <Button
              size="sm"
              onClick={() => onAdd(product)}
              disabled={disabled || isUnavailable}
              className="h-6 px-2 text-[10px] rounded-md"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: { id: string; name: string; description?: string | null };
  products: Product[];
  onAddProduct: (product: Product) => void;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function CategorySection({ 
  category, 
  products, 
  onAddProduct, 
  isExpanded, 
  onToggle,
  disabled 
}: CategorySectionProps) {
  if (products.length === 0) return null;

  return (
    <div id={`category-${category.id}`} className="scroll-mt-14">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 sticky top-12 z-20"
      >
        <div className="text-left">
          <h2 className="font-semibold text-foreground">{category.name}</h2>
          {category.description && (
            <p className="text-xs text-muted-foreground">{category.description}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      
      {/* Products */}
      {isExpanded && (
        <div className="bg-background">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAddProduct}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
