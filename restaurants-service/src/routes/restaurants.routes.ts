import express from 'express';
import * as ctrl from '../controllers/restaurants.controller';
import { authenticate } from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorize";
import { upload } from '../middlewares/upload';
import { getTelemetry } from "../controllers/telemetry.controller";

const router = express.Router();

router.get("/telemetry", getTelemetry);

// ===============================
// DEBUG ROUTES (VIVA / DEMO ONLY)
// ===============================
const DEBUG_ON = String(process.env.ENABLE_DEBUG_ROUTES).toLowerCase() === "true";

router.get("/debug/slow", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  const ms = Math.min(10000, Number(req.query.ms ?? 1000));
  await new Promise((r) => setTimeout(r, ms));
  res.json({ ok: true, delayed_ms: ms });
});

router.get("/debug/fail", (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  res.status(500).json({ ok: false, error: "forced_failure" });
});

router.get("/debug/mix", async (req, res) => {
  if (!DEBUG_ON) return res.status(404).json({ ok: false });
  Math.random() > 0.5
    ? res.status(500).json({ ok: false })
    : res.json({ ok: true });
});

router.post('/', upload.single('image'), authenticate, authorizeRoles("restaurantAdmin"), ctrl.create);
router.get('/', ctrl.list);
router.get("/my", authenticate, authorizeRoles("restaurantAdmin"), ctrl.getByUser);
router.get('/:id', ctrl.getOne);
router.patch('/:id/availability', authenticate, authorizeRoles("restaurantAdmin"), ctrl.toggleAvailability);
router.put('/:id', upload.single('image'), authenticate, authorizeRoles("restaurantAdmin"), ctrl.update);
router.delete('/:id', authenticate, authorizeRoles("restaurantAdmin"), ctrl.remove);


router.post('/:id/menu-items', upload.single('image'), authenticate, authorizeRoles("restaurantAdmin"), ctrl.addMenuItem);
router.get('/my/menu-items', authenticate, authorizeRoles("restaurantAdmin"), ctrl.getMenuItemsByUser);
router.get('/:id/menu-items', ctrl.listMenuItems);
router.get("/:id/menu-items/:itemId", ctrl.getOneMenuItem);
router.put('/:id/menu-items/:itemId', upload.single('image'), authenticate, authorizeRoles("restaurantAdmin"), ctrl.updateMenuItem);
router.delete('/:id/menu-items/:itemId', authenticate, authorizeRoles("restaurantAdmin"), ctrl.deleteMenuItem);


export default router;
