import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Menu from "./pages/Menu";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import OrderCheckout from "./pages/OrderCheckout";
import NotFound from "./pages/NotFound";
import AdminMarketing from "./pages/AdminMarketing";
import AdminMarketingLogin from "./pages/AdminMarketingLogin";
import AdminMarketingUploads from "./pages/AdminMarketingUploads";
import AdminMarketingPublic from "./pages/AdminMarketingPublic";
import AdminMarketingMaterial from "./pages/AdminMarketingMaterial";
import PrinterSettings from "./pages/admin/PrinterSettings";
import Waiter from "./pages/Waiter";
import CustomerLoyalty from "./pages/CustomerLoyalty";
import OrderReview from "./pages/OrderReview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/menu/:restaurantId" element={<Menu />} />
            <Route path="/checkout/:restaurantId" element={<OrderCheckout />} />
            <Route path="/pedido" element={<OrderTracking />} />
            <Route path="/historico" element={<OrderHistory />} />
            <Route path="/marketing" element={<AdminMarketing />} />
            <Route path="/marketing/login" element={<AdminMarketingLogin />} />
            <Route path="/marketing/uploads" element={<AdminMarketingUploads />} />
            <Route path="/marketing/public" element={<AdminMarketingPublic />} />
            <Route path="/marketing/material/:id" element={<AdminMarketingMaterial />} />
            <Route path="/admin/printer" element={<PrinterSettings />} />
            <Route path="/waiter" element={<Waiter />} />
            <Route path="/fidelidade/:restaurantId" element={<CustomerLoyalty />} />
            <Route path="/avaliar/:orderId" element={<OrderReview />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
