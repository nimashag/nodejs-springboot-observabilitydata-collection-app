import express from 'express';
import {
  registerUser,
  loginUser,
  getMyProfile,
  getAllUsers,
  updateUserById,
  deleteUserById,
  getUserById
} from '../controllers/users.authcontroller';
import { authenticate } from '../middleware/authMiddleware';
import { isAppAdmin } from '../middleware/role.middleware';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);


// Protected route
router.get('/me', authenticate, getMyProfile);

// Admin-only routes (requires appAdmin role)
router.get('/all', authenticate, isAppAdmin, getAllUsers);
router.put('/:id', authenticate, isAppAdmin, updateUserById);
router.get('/:id', getUserById);
router.delete('/:id', authenticate, isAppAdmin, deleteUserById);


export default router;