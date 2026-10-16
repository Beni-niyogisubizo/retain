import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getAdminInsights } from '../controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/insights', getAdminInsights);

export default router;
