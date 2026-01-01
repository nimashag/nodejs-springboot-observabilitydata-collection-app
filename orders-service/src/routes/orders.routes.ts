import { Router } from 'express';
import * as ctrl from '../controllers/orders.controller';
import { authenticate } from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorize";
import bodyParser from 'body-parser';
import { getTelemetry } from "../controllers/telemetry.controller";

const router = Router();

//Telemetry data
router.get("/telemetry", getTelemetry);

// DEBUG: intentionally slow endpoint to test anomaly detection
router.get("/debug/slow", async (req, res) => {
  const ms = Number(req.query.ms ?? 1200);
  await new Promise((r) => setTimeout(r, ms));
  res.json({ ok: true, delayed_ms: ms });
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