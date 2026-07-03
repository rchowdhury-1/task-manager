-- Starter topics are suggestions, not fixtures: existing "system" categories
-- (seeded by the old register flow) become ordinary user categories so every
-- account can rename or delete them.
UPDATE categories SET is_system = false WHERE is_system = true;
