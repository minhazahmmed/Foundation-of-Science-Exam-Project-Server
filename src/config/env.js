import dotenv from 'dotenv';

dotenv.config();

// এই দুটো না থাকলে সার্ভার চালু হবে না
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`.env ফাইলে ${key} নেই`);
    process.exit(1);
  }
}

// প্রোডাকশনে দুর্বল JWT_SECRET থাকলে সার্ভার চালুই হবে না (ছোট বা সহজ secret থেকে টোকেন নকল করা সম্ভব)
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET কমপক্ষে ৩২ অক্ষরের র‍্যান্ডম লেখা হতে হবে');
  process.exit(1);
}

// CLIENT_URL এ কমা দিয়ে একাধিক ঠিকানা দেওয়া যায়। শেষের / বাদ দেওয়া হয়, নাহলে CORS মেলে না।
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = {
  isProduction,
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: clientUrls[0], // পরীক্ষার লিংক বানাতে এটা লাগে
  clientUrls, // CORS এ এই সবগুলো ঠিকানা থেকে অনুরোধ নেওয়া হয়
  // মূল শিক্ষক (অ্যাডমিনের কাজ করেন)। এই ইমেইলের অ্যাকাউন্ট সবসময় শিক্ষক হয় এবং অন্য শিক্ষকদের অনুমোদন দিতে পারে।
  ownerEmail: (process.env.OWNER_EMAIL || 'minhazahmmed231@gmail.com').trim().toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
};
