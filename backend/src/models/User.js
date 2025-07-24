import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  products: [{ type: String, required: true }],
  pincode: { type: String, required: true },
  token: { type: String, required: true, unique: true }, // Persistent token for secure links
});

const User = mongoose.model('User', userSchema);
export default User; 