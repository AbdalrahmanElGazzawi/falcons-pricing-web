-- Add client billing + expiration fields to quotes so the PDF can render
-- the same level of detail as the legacy Falcons accounting quotation.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS client_address      text,
  ADD COLUMN IF NOT EXISTS client_vat_number   text,
  ADD COLUMN IF NOT EXISTS client_country      text,
  ADD COLUMN IF NOT EXISTS expires_at          date,
  ADD COLUMN IF NOT EXISTS payment_terms       text;

COMMENT ON COLUMN quotes.client_address    IS 'Client billing address (multiline). Used on the PDF billing block.';
COMMENT ON COLUMN quotes.client_vat_number IS 'Client VAT registration number (KSA Zakat etc).';
COMMENT ON COLUMN quotes.client_country    IS 'Client country (free text).';
COMMENT ON COLUMN quotes.expires_at        IS 'Quotation expiration / validity date.';
COMMENT ON COLUMN quotes.payment_terms     IS 'Payment terms text. Defaults to "Immediate Payment" on PDF if null.';
