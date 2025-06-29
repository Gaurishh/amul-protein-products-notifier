import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  products: [{ type: String, required: true }],
  subscribed: { type: Boolean, default: true },
});

const User = mongoose.model('User', userSchema);
export default User; 