import express from 'express';
import { processStockChanges } from '../controllers/stockController.js';

const router = express.Router();

router.post('/stock-changes', processStockChanges);

export default router; 