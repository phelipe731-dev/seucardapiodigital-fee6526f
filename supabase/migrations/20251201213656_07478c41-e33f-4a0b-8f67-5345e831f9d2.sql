-- Add is_daily_deal column to products table
ALTER TABLE products
ADD COLUMN is_daily_deal boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_products_daily_deal ON products(is_daily_deal) WHERE is_daily_deal = true;

-- Add comment
COMMENT ON COLUMN products.is_daily_deal IS 'Marca o produto como promoção do dia, destacado no cardápio';