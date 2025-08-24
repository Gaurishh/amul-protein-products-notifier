import Pincode from '../models/Pincode.js';
import Password from '../models/Password.js';

// GET /pincodes - Get all pincodes
export async function getPincodes(req, res) {
  try {
    const pincodes = await Pincode.find({}, '-_id pincode state lastInteracted');
    res.json({ success: true, pincodes });
  } catch (err) {
    console.error('Error fetching pincodes:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /pincodes - Add a new pincode
export async function addPincode(req, res) {
  const { pincode, state } = req.body;

  if (!pincode || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: pincode and state'
    });
  }

  // Validate pincode format (6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pincode format. Must be 6 digits.'
    });
  }

  // Validate state (non-empty string)
  if (!state.trim()) {
    return res.status(400).json({
      success: false,
      error: 'State name cannot be empty.'
    });
  }

  try {
    // Check if pincode already exists
    const existingPincode = await Pincode.findOne({ pincode });
    if (existingPincode) {
      return res.status(409).json({
        success: false,
        error: 'Pincode already exists'
      });
    }

    // Create new pincode
    const newPincode = new Pincode({
      pincode,
      state: state.trim(),
      lastInteracted: new Date()
    });
    await newPincode.save();

    res.status(201).json({
      success: true,
      message: 'Pincode added successfully',
      pincode: newPincode
    });
  } catch (err) {
    console.error('Error adding pincode:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /pincodes/:pincode - Delete a specific pincode
export async function deletePincode(req, res) {
  const { pincode } = req.params;

  if (!pincode) {
    return res.status(400).json({
      success: false,
      error: 'Missing pincode parameter'
    });
  }

  // Validate pincode format (6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pincode format. Must be 6 digits.'
    });
  }

  try {
    // Check if pincode exists
    const existingPincode = await Pincode.findOne({ pincode });
    if (!existingPincode) {
      return res.status(404).json({
        success: false,
        error: 'Pincode not found'
      });
    }

    // Delete the pincode
    await Pincode.deleteOne({ pincode });

    res.json({
      success: true,
      message: 'Pincode deleted successfully',
      deletedPincode: pincode
    });
  } catch (err) {
    console.error('Error deleting pincode:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /verifyPincodePassword - Verify pincode password
export async function verifyPincodePassword(req, res) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }

  try {
    // Check if password exists in the passwords collection
    const passwordDoc = await Password.findOne({});
    
    if (!passwordDoc) {
      return res.status(500).json({
        success: false,
        error: 'Password not configured in system'
      });
    }
    
    // Compare the entered password with the stored hash
    const isPasswordValid = await passwordDoc.comparePassword(password);
    
    if (isPasswordValid) {
      res.json({
        success: true,
        message: 'Password verified successfully'
      });
    } else {
      res.json({
        success: false,
        message: 'Invalid password'
      });
    }
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
