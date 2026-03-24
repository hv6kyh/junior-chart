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

console.log('Updating pattern stats...');
const result = await batch.updateAllStats();
console.log(`Done: ${result.updated} stats updated`);
