import express from 'express';
import { getProducts, addProduct, getProductSubscribers, } from '../controllers/productController.js';

const router = express.Router();

router.get('/products', getProducts);
router.post('/products', addProduct);
router.get('/product/:id/subscribers', getProductSubscribers);

export default router; 