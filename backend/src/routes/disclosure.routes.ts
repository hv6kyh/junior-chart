import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { DisclosureService } from '../services/disclosure/disclosure.service.js';
import { AnalysisService } from '../services/disclosure/analysis.service.js';
import { isValidDisclosureType, type DisclosureType } from '../services/disclosure/types.js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);

// GET /api/disclosures/today
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const date = (req.query.date as string) || today;
    const disclosures = await disclosureService.getDisclosuresByDate(date);

    const withStats = await Promise.all(
      disclosures.map(async (d) => {
        const stats = d.disclosureType
          ? await analysisService.getStatsByType(d.disclosureType)
          : [];
        return { disclosure: d, stats };
      })
    );

    res.json({ date, disclosures: withStats });
  } catch (err: any) {
    console.error('GET /disclosures/today error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/types
router.get('/types', async (_req: Request, res: Response) => {
  try {
    const summary = await analysisService.getAllTypesSummary();
    res.json({ types: summary });
  } catch (err: any) {
    console.error('GET /disclosures/types error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/stats/:type
router.get('/stats/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    if (!isValidDisclosureType(type)) {
      res.status(400).json({ error: `Invalid disclosure type: ${type}` });
      return;
    }

    const stats = await analysisService.getStatsByType(type as DisclosureType);
    res.json({ type, stats });
  } catch (err: any) {
    console.error('GET /disclosures/stats/:type error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const disclosure = await disclosureService.getDisclosureById(req.params.id);
    if (!disclosure) {
      res.status(404).json({ error: 'Disclosure not found' });
      return;
    }

    const stats = disclosure.disclosureType
      ? await analysisService.getStatsByType(disclosure.disclosureType)
      : [];

    res.json({ disclosure, stats });
  } catch (err: any) {
    console.error('GET /disclosures/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
