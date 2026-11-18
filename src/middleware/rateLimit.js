import { rateLimit } from 'express-rate-limit';

const tooMany = (message) => ({ message });

// লগইন/রেজিস্টারে পাসওয়ার্ড আন্দাজ করে ঢোকা ঠেকায়: একই আইপি থেকে ১৫ মিনিটে ২০ বার
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true, 
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('অনেকবার ভুল চেষ্টা করা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করো।'),
});

// ছবি থেকে প্রশ্ন বের করা Gemini এর সীমা খরচ করে, তাই ঘণ্টায় ৩০ বার
export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('একসাথে অনেকবার ছবি পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করো।'),
});

// সব API এর জন্য সাধারণ সীমা: একই আইপি থেকে মিনিটে ১০০০টা
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('অনেক বেশি অনুরোধ হয়েছে। একটু পর আবার চেষ্টা করো।'),
});
