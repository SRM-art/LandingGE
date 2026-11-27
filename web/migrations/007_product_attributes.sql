ALTER TABLE product ADD COLUMN tone TEXT CHECK (tone IN ('claro', 'medio', 'oscuro'));
ALTER TABLE product ADD COLUMN environment TEXT CHECK (environment IN ('seco', 'humedo', 'ambos'));
ALTER TABLE product ADD COLUMN slip_resistant INTEGER NOT NULL DEFAULT 0 CHECK (slip_resistant IN (0, 1));
