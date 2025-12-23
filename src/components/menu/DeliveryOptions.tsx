import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderType = 'delivery' | 'pickup' | 'dine-in';

interface DeliveryOptionsProps {
  selected: OrderType;
  onSelect: (type: OrderType) => void;
  acceptsDelivery?: boolean;
}

export function DeliveryOptions({ selected, onSelect, acceptsDelivery = true }: DeliveryOptionsProps) {
  const options = [
    { 
      id: 'delivery' as OrderType, 
      label: 'Delivery', 
      icon: Bike,
      disabled: !acceptsDelivery
    },
    { 
      id: 'pickup' as OrderType, 
      label: 'Retirada', 
      icon: ShoppingBag,
      disabled: false
    },
    { 
      id: 'dine-in' as OrderType, 
      label: 'Consumo no Local', 
      icon: UtensilsCrossed,
      disabled: false
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = selected === option.id;
        
        return (
          <button
            key={option.id}
            onClick={() => !option.disabled && onSelect(option.id)}
            disabled={option.disabled}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
              isSelected 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border bg-background text-muted-foreground hover:border-primary/50",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium text-center leading-tight">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
