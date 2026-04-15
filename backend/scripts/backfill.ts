import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DartProvider } from '../src/services/disclosure/providers/dart.provider.js';
import { DisclosureService } from '../src/services/disclosure/disclosure.service.js';
import { AnalysisService } from '../src/services/disclosure/analysis.service.js';
import { BatchService } from '../src/services/disclosure/batch.service.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const provider = new DartProvider(process.env.DART_API_KEY!);
const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);
const batch = new BatchService(provider, disclosureService, analysisService, supabase);

// CLI: npx tsx scripts/backfill.ts [--from 2024-01-01] [--to 2026-03-31] [--skip-collect] [--skip-prices] [--skip-stats]
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}
const hasFlag = (name: string) => args.includes(`--${name}`);

const to = new Date(getArg('to') || new Date().toISOString().slice(0, 10));
const from = new Date(getArg('from') || (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return d.toISOString().slice(0, 10); })());
const skipCollect = hasFlag('skip-collect');
const skipPrices = hasFlag('skip-prices');
const skipStats = hasFlag('skip-stats');

const toStr = to.toISOString().slice(0, 10);
const fromStr = from.toISOString().slice(0, 10);

if (skipCollect) console.log('(--skip-collect: skipping collection phase)');
if (skipPrices) console.log('(--skip-prices: skipping price update)');
if (skipStats) console.log('(--skip-stats: skipping stats calculation)');

let totalCollected = 0;
let totalClassified = 0;

if (!skipCollect) {
  console.log(`Backfilling disclosures from ${fromStr} to ${toStr}...`);

  const current = new Date(from);

  while (current < to) {
    const monthEnd = new Date(current);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    if (monthEnd > to) monthEnd.setTime(to.getTime());

    const monthFrom = current.toISOString().slice(0, 10);
    const monthTo = monthEnd.toISOString().slice(0, 10);

    console.log(`  ${monthFrom} ~ ${monthTo}...`);
    const result = await batch.collectHistorical(monthFrom, monthTo);
    totalCollected += result.total;
    totalClassified += result.classified;
    console.log(`    → ${result.total} collected, ${result.classified} classified`);

    current.setMonth(current.getMonth() + 1);
    current.setDate(1);

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nBackfill complete: ${totalCollected} total, ${totalClassified} classified`);
}

if (!skipPrices) {
  console.log('\nUpdating prices (this may take a while)...');
  const priceResult = await batch.updatePrices();
  console.log(`Prices: ${priceResult.updated} updated, ${priceResult.failed} failed`);
}

if (!skipStats) {
  console.log('\nCalculating pattern stats...');
  const statsResult = await batch.updateAllStats();
  console.log(`Stats: ${statsResult.updated} stats calculated`);
}

console.log('\nBackfill pipeline complete!');
