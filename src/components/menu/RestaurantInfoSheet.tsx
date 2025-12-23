import { MapPin, Phone, Clock, CreditCard, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  phone: string;
  whatsapp: string;
  address: string | null;
  opening_time: string | null;
  closing_time: string | null;
  working_days: string[] | null;
  payment_methods: string[] | null;
}

interface RestaurantInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function RestaurantInfoSheet({ open, onOpenChange, restaurant }: RestaurantInfoSheetProps) {
  const workingDays = restaurant.working_days || DAY_ORDER;
  const paymentMethods = restaurant.payment_methods || ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Informações do Restaurante</SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-full pb-8 space-y-6">
          {/* About */}
          {restaurant.description && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Sobre</h3>
              <p className="text-sm text-muted-foreground">{restaurant.description}</p>
            </div>
          )}
          
          <Separator />
          
          {/* Operating Hours */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Horário de Funcionamento</h3>
            </div>
            <div className="space-y-2">
              {DAY_ORDER.map((day) => {
                const isWorking = workingDays.includes(day);
                return (
                  <div 
                    key={day} 
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className={isWorking ? "text-foreground" : "text-muted-foreground"}>
                      {DAY_LABELS[day]}
                    </span>
                    <span className={isWorking ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {isWorking 
                        ? `${restaurant.opening_time || '09:00'} - ${restaurant.closing_time || '22:00'}`
                        : 'Fechado'
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* Payment Methods */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Formas de Pagamento</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <Badge key={method} variant="secondary" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Contato</h3>
            </div>
            <div className="space-y-2 text-sm">
              {restaurant.phone && (
                <a 
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>{restaurant.phone}</span>
                </a>
              )}
              {restaurant.whatsapp && (
                <a 
                  href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
                >
                  <span>WhatsApp: {restaurant.whatsapp}</span>
                </a>
              )}
            </div>
          </div>
          
          {/* Address */}
          {restaurant.address && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Endereço</h3>
                </div>
                <p className="text-sm text-muted-foreground">{restaurant.address}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
