import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'নাম দিতে হবে'], trim: true },
    email: {
      type: String,
      required: [true, 'ইমেইল দিতে হবে'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  },
  { timestamps: true }
);

// সেভ করার আগে পাসওয়ার্ড হ্যাশ হয়
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

export default mongoose.model('User', userSchema);
