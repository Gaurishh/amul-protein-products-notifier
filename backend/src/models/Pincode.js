import mongoose from 'mongoose';

const pincodeSchema = new mongoose.Schema({
  pincode: { type: String, required: true, unique: true },
  lastInteracted: { type: Date, required: true },
});

const Pincode = mongoose.model('Pincode', pincodeSchema);
export default Pincode; 