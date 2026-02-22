import { Router } from 'express';
import * as ctrl from '../controllers/orders.controller';
import { authenticate } from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorize";
import bodyParser from 'body-parser';
import { getTelemetry } from "../controllers/telemetry.controller";

const router = Router();

//Telemetry data
router.get("/telemetry", getTelemetry);

// ===============================
// DEBUG ROUTES (VIVA / DEMO ONLY)
// Enable with: ENABLE_DEBUG_ROUTES=true
// ===============================
const DEBUG_ON = String(process.env.ENABLE_DEBUG_ROUTES).toLowerCase() === "true";

// Slow endpoint → latency spike
router.get("/debug/slow", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });

  const ms = Math.min(15000, Number(req.query.ms ?? 1200));
  await new Promise((r) => setTimeout(r, ms));
  res.json({ ok: true, delayed_ms: ms });
});

// Fail endpoint → error burst
router.get("/debug/fail", (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });

  const code = Math.max(400, Math.min(599, Number(req.query.code ?? 500)));
  res.status(code).json({ ok: false, error: "forced_failure", code });
});

// Mixed chaos
router.get("/debug/mix", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });

  const roll = Math.random();
  if (roll < 0.4) {
    await new Promise((r) => setTimeout(r, 800));
    return res.json({ ok: true, slow: true });
  }
  if (roll < 0.8) {
    return res.status(500).json({ ok: false, error: "random_failure" });
  }
  res.json({ ok: true, normal: true });
});

router.post('/', authenticate, authorizeRoles("customer"), ctrl.create);
router.get('/', ctrl.getAll);
router.get('/restaurant/:restaurantId', ctrl.getByRestaurantId);
router.get('/:id', ctrl.getOne);
router.put('/:id', authenticate, ctrl.update);
router.patch("/:id/delivery-address", authenticate, authorizeRoles("customer"), ctrl.updateDeliveryAddress);
router.patch("/:id/special-instructions", authenticate, authorizeRoles("customer"), ctrl.updateSpecialInstructions);
router.delete('/:id', authenticate, authorizeRoles("customer"), ctrl.deleteOrder);

router.post('/create-payment-intent', authenticate, authorizeRoles("customer"), ctrl.createPaymentIntent);
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), ctrl.stripeWebhook);
router.patch('/:id/mark-paid', authenticate, ctrl.markOrderAsPaid);

// Update just the order status
router.patch('/:id/status', authenticate, authorizeRoles("admin", "restaurantAdmin"), ctrl.updateOrderStatus);


export default router;