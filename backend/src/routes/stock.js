import express from 'express';
import { processStockChanges, getStockStatus } from '../controllers/stockController.js';

const router = express.Router();

router.post('/stock-changes', processStockChanges);
router.get('/stock-status', getStockStatus);

export default router; 