CREATE TABLE IF NOT EXISTS asset_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  compiled_prompt TEXT NOT NULL,
  style_profile TEXT NOT NULL,
  target_polycount INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  provider_preview_id TEXT,
  provider_refine_id TEXT,
  model_key TEXT,
  thumbnail_key TEXT,
  error TEXT,
  consumed_credits INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_jobs_status_created
ON asset_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_jobs_category_created
ON asset_jobs(category, created_at DESC);

CREATE TABLE IF NOT EXISTS asset_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model_key TEXT NOT NULL,
  thumbnail_key TEXT,
  provider TEXT NOT NULL,
  provider_task_id TEXT,
  target_polycount INTEGER NOT NULL,
  consumed_credits INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_catalog_category_created
ON asset_catalog(category, created_at DESC);
