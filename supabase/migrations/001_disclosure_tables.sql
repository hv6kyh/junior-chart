-- supabase/migrations/001_disclosure_tables.sql

-- 공시 테이블
CREATE TABLE disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'dart',
  source_id text NOT NULL,
  corp_code text NOT NULL,
  corp_name text NOT NULL,
  stock_code text,
  market text,  -- Y=KOSPI, K=KOSDAQ (Yahoo Finance 심볼 접미사 결정용)
  disclosure_type text,
  title text NOT NULL,
  disclosed_at date NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disclosures_source_id_unique UNIQUE (source, source_id)
);

CREATE INDEX idx_disclosures_type ON disclosures (disclosure_type);
CREATE INDEX idx_disclosures_date ON disclosures (disclosed_at DESC);
CREATE INDEX idx_disclosures_stock ON disclosures (stock_code);

-- 공시 기준 주가
CREATE TABLE disclosure_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id uuid NOT NULL REFERENCES disclosures(id) ON DELETE CASCADE,
  base_price numeric,
  price_1w numeric,
  price_1m numeric,
  price_3m numeric,
  return_1w numeric,
  return_1m numeric,
  return_3m numeric,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disclosure_prices_disclosure_unique UNIQUE (disclosure_id)
);

-- 패턴 통계 캐시
CREATE TABLE pattern_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_type text NOT NULL,
  period text NOT NULL CHECK (period IN ('1w', '1m', '3m')),
  sample_count integer NOT NULL DEFAULT 0,
  avg_return numeric,
  median_return numeric,
  stddev numeric,
  positive_rate numeric,
  ci_lower_68 numeric,
  ci_upper_68 numeric,
  ci_lower_95 numeric,
  ci_upper_95 numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pattern_stats_type_period_unique UNIQUE (disclosure_type, period)
);

-- 구독자 (Phase 3용, 미리 생성)
CREATE TABLE subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
