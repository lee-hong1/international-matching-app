-- services_currency_backfill.sql
-- Backfill NULL currency on services using host's country, then enforce NOT NULL.
-- JP → JPY, CN → CNY, default → KRW.

UPDATE services s
SET currency = CASE
  WHEN UPPER(p.country) = 'JP' THEN 'JPY'
  WHEN UPPER(p.country) = 'CN' THEN 'CNY'
  ELSE 'KRW'
END
FROM profiles p
WHERE s.host_id = p.id
  AND s.currency IS NULL;

-- Remaining nulls (host profile missing) → KRW
UPDATE services SET currency = 'KRW' WHERE currency IS NULL;

ALTER TABLE services ALTER COLUMN currency SET NOT NULL;
ALTER TABLE services ALTER COLUMN currency SET DEFAULT 'KRW';
