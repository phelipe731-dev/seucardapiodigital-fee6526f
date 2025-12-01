-- ============================================
-- FASE 2: SISTEMA DE AVALIAÇÕES
-- ============================================

-- Tabela de avaliações de pedidos
CREATE TABLE order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  waiter_id uuid,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_rating integer CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  delivery_rating integer CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  comment text,
  customer_name text,
  customer_phone text,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_order_reviews_restaurant ON order_reviews(restaurant_id);
CREATE INDEX idx_order_reviews_waiter ON order_reviews(waiter_id);
CREATE INDEX idx_order_reviews_created ON order_reviews(created_at DESC);

-- RLS Policies
ALTER TABLE order_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reviews" 
ON order_reviews FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Restaurant owners can view their reviews" 
ON order_reviews FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = order_reviews.restaurant_id AND owner_id = auth.uid()
));

CREATE POLICY "Restaurant owners can manage their reviews" 
ON order_reviews FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = order_reviews.restaurant_id AND owner_id = auth.uid()
));

CREATE POLICY "Anyone can view published reviews" 
ON order_reviews FOR SELECT 
USING (is_published = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_order_reviews_updated_at
BEFORE UPDATE ON order_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FASE 3: SISTEMA DE MESAS E RESERVAS
-- ============================================

-- Tabela de mesas
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  location text CHECK (location IN ('internal', 'external', 'vip', 'balcony')),
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  qr_code_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- Índices
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_tables_status ON tables(status);

-- RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tables" 
ON tables FOR SELECT 
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their tables" 
ON tables FOR ALL 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = tables.restaurant_id AND owner_id = auth.uid()
));

-- Trigger
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON tables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de reservas
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  party_size integer NOT NULL CHECK (party_size > 0),
  duration_minutes integer DEFAULT 90,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  confirmation_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX idx_reservations_table ON reservations(table_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_phone ON reservations(customer_phone);

-- Função para gerar código de confirmação
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reservation_confirmation_code
BEFORE INSERT ON reservations
FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservations" 
ON reservations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Restaurant owners can view their reservations" 
ON reservations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = reservations.restaurant_id AND owner_id = auth.uid()
));

CREATE POLICY "Restaurant owners can manage their reservations" 
ON reservations FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = reservations.restaurant_id AND owner_id = auth.uid()
));

CREATE POLICY "Waiters can view reservations" 
ON reservations FOR SELECT 
USING (has_role(auth.uid(), 'waiter'));

CREATE POLICY "Waiters can update reservations" 
ON reservations FOR UPDATE 
USING (has_role(auth.uid(), 'waiter'));

-- Trigger
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar status da mesa quando reserva é confirmada/cancelada
CREATE OR REPLACE FUNCTION update_table_status_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando reserva é confirmada, marcar mesa como reservada
  IF NEW.status = 'confirmed' AND NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET status = 'reserved' 
    WHERE id = NEW.table_id;
  END IF;
  
  -- Quando reserva é cancelada ou completada, liberar mesa
  IF (NEW.status IN ('cancelled', 'completed', 'no_show')) AND NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET status = 'available' 
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_status_update
AFTER UPDATE OF status ON reservations
FOR EACH ROW EXECUTE FUNCTION update_table_status_on_reservation();