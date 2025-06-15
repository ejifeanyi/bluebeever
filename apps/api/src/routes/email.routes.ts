import { Router } from 'express';
import { EmailController } from '@/controllers/email.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/sync', (req, res) => {
  EmailController.syncEmails(req, res);
});

router.patch('/:id/read', (req, res) => {
  EmailController.markEmailAsRead(req, res);
});

router.get('/:id', (req, res) => {
  EmailController.getEmail(req, res);
});

router.get('/', (req, res) => {
  EmailController.getEmails(req, res);
});

export { router as emailRoutes };