import { Router } from 'express';
import { assignDriverAutomatically, respondToAssignment, getAssignedOrders,getMyDeliveries, updateDeliveryStatus } from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth'; // <--- correct path
import { authorizeRoles } from '../middleware/authorize'; // <--- correct path
import { getTelemetry } from "../controllers/telemetry.controller";

const router = Router();
router.get("/telemetry", getTelemetry);

// ===============================
// DEBUG ROUTES (VIVA / DEMO ONLY)
// ===============================
const DEBUG_ON = String(process.env.ENABLE_DEBUG_ROUTES).toLowerCase() === "true";

router.get("/debug/slow", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  await new Promise((r) => setTimeout(r, 700));
  res.json({ ok: true });
});

router.get("/debug/fail", (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  res.status(503).json({ ok: false, error: "delivery_down" });
});

router.get("/debug/mix", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  if (Math.random() > 0.6) {
    return res.status(503).json({ ok: false });
  }
  await new Promise((r) => setTimeout(r, 400));
  res.json({ ok: true });
});

// Admin/system will assign driver (no role restriction, just authenticated)
router.post('/assign', authenticate, assignDriverAutomatically);

// Driver only can respond to assignment
router.post('/respond', authenticate, authorizeRoles('deliveryPersonnel'), respondToAssignment);

// Driver only can view assigned orders
router.get('/assigned-orders', authenticate, authorizeRoles('deliveryPersonnel'), getAssignedOrders);

// ✅ Fetch all deliveries for my dashboard
router.get('/my-deliveries', authenticate, authorizeRoles('deliveryPersonnel'), getMyDeliveries);

// ✅ Update delivery status (PickedUp, Delivered, Cancelled)
router.patch('/delivery/:deliveryId/status', authenticate, authorizeRoles('deliveryPersonnel'), updateDeliveryStatus);

export default router;
