import { Router } from "express";
import { EmailController } from "@/controllers/email.controller";
import { authenticate } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

// Sync endpoints
router.post("/sync/quick", EmailController.quickSync);
router.post("/sync/full", EmailController.fullSync);
router.post("/sync/incremental", EmailController.incrementalSync);
router.post("/sync/reset", EmailController.resetSync);
router.get("/sync/status", EmailController.getSyncStatus);

// **REAL-TIME UPDATES**: Connection status endpoint
router.get("/connection/status", EmailController.getConnectionStatus);

// **SMART PRIORITIZATION**: Recent emails endpoint
router.get("/recent", EmailController.getRecentEmails);

// Search endpoint
router.get("/search", EmailController.searchEmails);

// Category endpoints
router.get("/category/:category", EmailController.getEmailsByCategory);
router.get("/categories", EmailController.getCategories);

// Email actions
router.patch("/:id/read", EmailController.markEmailAsRead);
router.patch("/:id/category", EmailController.updateEmailCategory);

// Stats and individual email endpoints
router.get("/stats", EmailController.getEmailStats);
router.get("/:id", EmailController.getEmail);

// **PREDICTIVE LOADING**: Enhanced emails endpoint (must be last)
router.get("/", EmailController.getEmails);

export { router as emailRoutes };
