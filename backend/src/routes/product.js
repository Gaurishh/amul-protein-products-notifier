import express from 'express';
import { getProducts, addProduct, verifyPincode } from '../controllers/productController.js';

const router = express.Router();

router.get('/products', getProducts);
router.post('/products', addProduct);
router.post('/verify-pincode', verifyPincode);

export default router; 