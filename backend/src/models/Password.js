import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const passwordSchema = new mongoose.Schema({
  pincodePassword: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Hash password before saving
passwordSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('pincodePassword')) return next();
  
  try {
    // Hash password with salt rounds of 12
    const saltRounds = 12;
    this.pincodePassword = await bcrypt.hash(this.pincodePassword, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password with hash
passwordSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.pincodePassword);
};

const Password = mongoose.model('Password', passwordSchema);

export default Password;
