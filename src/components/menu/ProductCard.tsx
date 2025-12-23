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
        "flex gap-3 p-3 border-b last:border-b-0 transition-colors",
        isUnavailable ? "opacity-60" : "hover:bg-muted/50"
      )}
    >
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>
        )}
        <span className="text-sm font-semibold text-primary">
          R$ {product.price.toFixed(2).replace('.', ',')}
        </span>
      </div>
      
      {/* Product Image & Add Button */}
      <div className="relative flex-shrink-0">
        {product.image_url ? (
          <div className="relative">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            {isUnavailable && (
              <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">Esgotado</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-3xl">🍽️</span>
          </div>
        )}
        
        {!isUnavailable && (
          <Button
            size="icon"
            onClick={() => onAdd(product)}
            disabled={disabled || isUnavailable}
            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
