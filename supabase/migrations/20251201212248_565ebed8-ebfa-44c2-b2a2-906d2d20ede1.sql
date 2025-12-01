-- Corrigir avisos de segurança das funções trigger

-- Função generate_confirmation_code com search_path
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Função update_table_status_on_reservation com search_path
CREATE OR REPLACE FUNCTION update_table_status_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET status = 'reserved' 
    WHERE id = NEW.table_id;
  END IF;
  
  IF (NEW.status IN ('cancelled', 'completed', 'no_show')) AND NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET status = 'available' 
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$;