ALTER TABLE product ADD COLUMN discount_price_cents INTEGER NOT NULL DEFAULT 0
CHECK (
  discount_price_cents = 0 OR
  (discount_price_cents > 0 AND price_cents IS NOT NULL AND discount_price_cents < price_cents)
);
