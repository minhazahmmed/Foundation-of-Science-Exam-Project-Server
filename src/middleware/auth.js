import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isOwnerEmail } from '../utils/owner.js';
import { verifyToken } from '../utils/token.js';

// লগইন করা আছে কিনা দেখে। ঠিক থাকলে req.user এ ইউজার বসায়।
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'আগে লগইন করো');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'লগইনের মেয়াদ শেষ, আবার লগইন করো');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'অ্যাকাউন্ট পাওয়া যায়নি');

  req.user = user;
  next();
});

// allowRoles('teacher') দিলে শুধু টিচার ঢুকতে পারবে
export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'এই কাজের অনুমতি তোমার নেই'));
  }
  next();
};

// শুধু মূল শিক্ষক (OWNER_EMAIL) ঢুকতে পারবেন, শিক্ষক অনুমোদনের কাজে লাগে
export const requireOwner = (req, res, next) => {
  if (req.user.role === 'teacher' && isOwnerEmail(req.user.email)) return next();
  next(new ApiError(403, 'এই কাজ শুধু মূল শিক্ষক করতে পারেন'));
};
