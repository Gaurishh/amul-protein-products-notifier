import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  products: [{ type: String, required: true }],
  pincode: { type: String, required: true },
  token: { type: String, required: true, unique: true }, // Persistent token for secure links
  emailVerified: { type: Boolean, default: false },
  recentlyUnsubscribed: { type: Boolean, default: false }, // Flag to track recently unsubscribed users
  // TTL: documents with a past expiresAt will be auto-removed by MongoDB
  expiresAt: { type: Date, default: null }
});

// TTL index: expire documents when expiresAt <= now
userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
export default User; 