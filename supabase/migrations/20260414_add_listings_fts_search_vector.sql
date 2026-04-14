-- Full-text search: add tsvector generated column on listings(title, description)
ALTER TABLE listings
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- GIN index for fast full-text lookups
CREATE INDEX idx_listings_search_vector ON listings USING GIN (search_vector);
