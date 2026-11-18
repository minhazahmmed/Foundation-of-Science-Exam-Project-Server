import mongoose from 'mongoose';
import { env } from './env.js';

// Vercel এর মতো serverless এ প্রতি অনুরোধে নতুন কানেকশন না খুলে আগেরটাই কাজে লাগানো হয়
let connecting = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((err) => {
      connecting = null; // ব্যর্থ হলে পরের অনুরোধে আবার চেষ্টা হবে
      throw err;
    });
  }
  await connecting;
  console.log('MongoDB connected');
}
