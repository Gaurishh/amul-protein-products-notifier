import express from 'express';
import { subscribeUser, getUser, updateUser, deleteUser, unsubscribeByToken, editSubscriptionByToken } from '../controllers/userController.js';

const router = express.Router();

router.post('/subscribe', subscribeUser);
router.get('/user/:email', getUser);
router.put('/user/:email', updateUser);
router.delete('/user/:email', deleteUser);
router.delete('/unsubscribe', unsubscribeByToken); // expects ?token=...
router.put('/edit-subscription', editSubscriptionByToken); // expects ?token=... and body with new data

export default router;