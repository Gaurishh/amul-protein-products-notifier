import express from 'express';
import { subscribeUser, getUser, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/subscribe', subscribeUser);
router.get('/user/:email', getUser);
router.put('/user/:email', updateUser);
router.delete('/user/:email', deleteUser);

export default router;