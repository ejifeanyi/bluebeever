import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

router.use((req, res, next) => {
  console.log(`🌐 Auth route hit: ${req.method} ${req.originalUrl}`);
  console.log(`📋 Query params:`, req.query);
  console.log(`📋 Body:`, req.body);
  next();
});

router.get('/google', (req, res) => {
  console.log('📍 /auth/google route handler executing');
  AuthController.googleAuth(req, res);
});

router.get('/google/callback', (req, res) => {
  console.log('📍 /auth/google/callback route handler executing');
  console.log('📋 Callback query:', req.query);
  AuthController.googleCallback(req, res);
});

router.post('/refresh', authenticate, (req, res) => {
  console.log('📍 /auth/refresh route handler executing');
  AuthController.refreshToken(req, res);
});

router.post('/logout', authenticate, (req, res) => {
  console.log('📍 /auth/logout route handler executing');
  AuthController.logout(req, res);
});

router.get('/me', authenticate, (req, res) => {
  console.log('📍 /auth/me route handler executing');
  AuthController.me(req, res);
});

export { router as authRoutes };