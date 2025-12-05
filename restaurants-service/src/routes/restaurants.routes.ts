import express from 'express';
import * as ctrl from '../controllers/restaurants.controller';
import { authenticate } from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorize";
import { upload } from '../middlewares/upload';

const router = express.Router();

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
