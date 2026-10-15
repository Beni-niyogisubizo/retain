import { Router } from 'express';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listExpenses);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
