import express from 'express';
import { getPincodes, addPincode, deletePincode, verifyPincodePassword } from '../controllers/pincodeController.js';

const router = express.Router();

// GET /pincodes - Get all pincodes
router.get('/pincodes', getPincodes);

// POST /pincodes - Add a new pincode
router.post('/pincodes', addPincode);

// DELETE /pincodes/:pincode - Delete a specific pincode
router.delete('/pincodes/:pincode', deletePincode);

// POST /verifyPincodePassword - Verify pincode password
router.post('/verifyPincodePassword', verifyPincodePassword);

export default router;
