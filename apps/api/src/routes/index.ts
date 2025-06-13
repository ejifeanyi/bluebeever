import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { emailRoutes } from './email.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as routes };