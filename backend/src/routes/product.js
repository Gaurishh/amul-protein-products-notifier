import express from 'express';
import { getProducts, addProduct, verifyPincode, trackPincodeInteraction, deletePincode } from '../controllers/productController.js';

const router = express.Router();

router.get('/products', getProducts);
router.post('/products', addProduct);
router.post('/verify-pincode', verifyPincode);
router.post('/track-pincode', trackPincodeInteraction);
router.delete('/pincode/:pincode', deletePincode);

export default router; 