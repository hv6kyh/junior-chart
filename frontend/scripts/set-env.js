const { writeFileSync } = require('fs');
const { resolve } = require('path');

const posthogApiKey = process.env['POSTHOG_API_KEY'] ?? '';
const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] ?? '';
const apiUrl = process.env['API_URL'] ?? 'https://api-junior-chart.vercel.app/api';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY is not set.');
}

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  posthog: {
    apiKey: '${posthogApiKey}',
    apiHost: 'https://us.i.posthog.com',
  },
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
};
`;

const target = resolve(__dirname, '../src/environments/environment.prod.ts');
writeFileSync(target, content, 'utf8');
console.log(`Generated ${target}`);
