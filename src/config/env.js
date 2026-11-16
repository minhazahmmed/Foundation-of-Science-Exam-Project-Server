import dotenv from 'dotenv';

dotenv.config();

// এই দুটো না থাকলে সার্ভার চালু হবে না
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`.env ফাইলে ${key} নেই`);
    process.exit(1);
  }
}

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // মূল শিক্ষক (অ্যাডমিনের কাজ করেন)। এই ইমেইলের অ্যাকাউন্ট সবসময় শিক্ষক হয় এবং অন্য শিক্ষকদের অনুমোদন দিতে পারে।
  ownerEmail: (process.env.OWNER_EMAIL || 'minhazahmmed231@gmail.com').trim().toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
};
