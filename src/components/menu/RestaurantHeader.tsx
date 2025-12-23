import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { RestaurantInfoSheet } from "./RestaurantInfoSheet";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string;
  whatsapp: string;
  address: string | null;
  opening_time: string | null;
  closing_time: string | null;
  accepts_delivery: boolean | null;
  working_days: string[] | null;
  accepts_orders_override: boolean | null;
  delivery_time_min: number | null;
  delivery_time_max: number | null;
  payment_methods: string[] | null;
}

interface RestaurantHeaderProps {
  restaurant: Restaurant;
  isOpen: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function RestaurantHeader({ 
  restaurant, 
  isOpen, 
  searchTerm, 
  onSearchChange 
}: RestaurantHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);

  const deliveryTimeMin = restaurant.delivery_time_min || 30;
  const deliveryTimeMax = restaurant.delivery_time_max || 45;

  return (
    <>
      <header className="relative">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-56 bg-muted overflow-hidden">
          {restaurant.cover_url ? (
            <img
              src={restaurant.cover_url}
              alt={`${restaurant.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Top Navigation */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">Menu</h2>
                  <nav className="space-y-2">
                    <a href="#" className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors">Início</a>
                    <a href="#" className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors">Sobre nós</a>
                    <a href="#" className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors">Contato</a>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Search Overlay */}
          {searchOpen && (
            <div className="absolute top-16 left-4 right-4 z-20 animate-fade-in-up">
              <Input
                type="text"
                placeholder="Buscar no cardápio..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-background shadow-lg border-0"
                autoFocus
              />
            </div>
          )}
        </div>
        
        {/* Logo and Info */}
        <div className="relative px-4 pb-4 -mt-12">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="relative mb-3">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg bg-background"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-lg">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Restaurant Name */}
            <h1 className="text-xl font-bold text-foreground mb-2">
              {restaurant.name}
            </h1>
            
            {/* Status Badge */}
            <Badge 
              variant={isOpen ? "default" : "destructive"} 
              className={`mb-3 ${isOpen ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              {isOpen ? "Aberto" : "Fechado"}
            </Badge>
            
            {/* Delivery Time and More Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>⏱ {deliveryTimeMin}-{deliveryTimeMax}min</span>
              <span>•</span>
              <button 
                onClick={() => setInfoSheetOpen(true)}
                className="text-primary font-medium hover:underline"
              >
                Ver mais
              </button>
            </div>
          </div>
        </div>
      </header>

      <RestaurantInfoSheet 
        open={infoSheetOpen} 
        onOpenChange={setInfoSheetOpen}
        restaurant={restaurant}
      />
    </>
  );
}
