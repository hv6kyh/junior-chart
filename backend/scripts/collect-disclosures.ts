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

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().slice(0, 10);

console.log(`Collecting disclosures for ${dateStr}...`);
const result = await batch.collectDisclosures(dateStr);
console.log(`Done: ${result.total} total, ${result.classified} classified`);
