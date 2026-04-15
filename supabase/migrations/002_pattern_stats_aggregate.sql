-- supabase/migrations/002_pattern_stats_aggregate.sql
--
-- Aggregate 39 (type × period) rows of pattern statistics in a single
-- Postgres pass. Replaces 39 PostgREST round trips that transferred
-- ~270k rows and hit the authenticator role's 8s statement_timeout.
--
-- The function sets its own statement_timeout to 60s so it is not bound
-- by the caller role's default (anon 3s / authenticated 8s). CI 68/95
-- intervals are still computed in TypeScript because the t-multiplier
-- lookup table lives there.

CREATE OR REPLACE FUNCTION public.compute_pattern_stats()
RETURNS TABLE (
  disclosure_type text,
  period text,
  sample_count integer,
  avg_return numeric,
  median_return numeric,
  stddev numeric,
  positive_rate numeric
)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  WITH expanded AS (
    SELECT
      d.disclosure_type AS dt,
      p.k AS prd,
      p.v AS r
    FROM public.disclosure_prices dp
    INNER JOIN public.disclosures d ON d.id = dp.disclosure_id
    CROSS JOIN LATERAL (VALUES
      ('1w'::text, dp.return_1w),
      ('1m'::text, dp.return_1m),
      ('3m'::text, dp.return_3m)
    ) AS p(k, v)
    WHERE d.disclosure_type IS NOT NULL
      AND p.v IS NOT NULL
  )
  SELECT
    expanded.dt,
    expanded.prd,
    COUNT(*)::int,
    AVG(expanded.r),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY expanded.r),
    STDDEV_SAMP(expanded.r),
    (COUNT(*) FILTER (WHERE expanded.r > 0))::numeric / NULLIF(COUNT(*), 0)
  FROM expanded
  GROUP BY expanded.dt, expanded.prd;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_pattern_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_pattern_stats() TO service_role;
