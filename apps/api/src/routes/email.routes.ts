import { Router } from 'express';
import { EmailController } from '@/controllers/email.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

router.use(authenticate);

// Sync endpoints
router.post('/sync/quick', EmailController.quickSync);
router.post('/sync/full', EmailController.fullSync);
router.post('/sync/incremental', EmailController.incrementalSync);
router.post('/sync/reset', EmailController.resetSync);
router.get('/sync/status', EmailController.getSyncStatus);

// Email endpoints
router.patch('/:id/read', EmailController.markEmailAsRead);
router.get('/stats', EmailController.getEmailStats);
router.get('/:id', EmailController.getEmail);
router.get('/', EmailController.getEmails);

export { router as emailRoutes };