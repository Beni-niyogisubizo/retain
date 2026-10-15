import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  setBudget,
  getMonthlySummary,
} from '../controllers/budgetController.js';

const router = Router();

router.use(requireAuth);
router.get('/:month', getMonthlySummary);
router.put('/:month', setBudget);

export default router;
