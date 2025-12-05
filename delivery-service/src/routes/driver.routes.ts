import { Router } from 'express';
import { registerDriver, updateDriver, getDriverProfile } from '../controllers/driver.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { upload } from '../middleware/upload'; 

const router = Router();

router.post('/register', authenticate, authorizeRoles('deliveryPersonnel'), upload.single('profileImage'), registerDriver);
router.patch('/me', authenticate, authorizeRoles('deliveryPersonnel'), upload.single('profileImage'), updateDriver);
router.get('/me', authenticate, authorizeRoles('deliveryPersonnel'), getDriverProfile);

export default router;
