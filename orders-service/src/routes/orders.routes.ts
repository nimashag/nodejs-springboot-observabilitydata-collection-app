import { Router } from 'express';
import * as ctrl from '../controllers/orders.controller';
import { authenticate } from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorize";
import bodyParser from 'body-parser';

const router = Router();

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