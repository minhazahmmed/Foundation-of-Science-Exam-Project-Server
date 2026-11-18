import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { publicUser } from '../utils/format.js';
import { isOwnerEmail } from '../utils/owner.js';
import { signToken } from '../utils/token.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
// সবাই স্টুডেন্ট হিসেবে খোলে। wantsTeacher দিলে শিক্ষক হওয়ার অনুরোধ জমা হয়, মূল শিক্ষক অনুমোদন দিলে তবে শিক্ষক হয়।
// OWNER_EMAIL এর ইমেইলে খুললে সরাসরি শিক্ষক (মূল শিক্ষক) হয়।
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const wantsTeacher = req.body.wantsTeacher === true;

  // শুধু সাধারণ লেখা নেওয়া হয়, অবজেক্ট বা অ্যারে পাঠিয়ে কুয়েরি বিগড়ানোর সুযোগ বন্ধ
  if (![name, email, password].every((v) => typeof v === 'string' && v.trim())) {
    throw new ApiError(400, 'নাম, ইমেইল ও পাসওয়ার্ড দিতে হবে');
  }
  if (name.trim().length > 80) throw new ApiError(400, 'নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারবে');
  if (!EMAIL_PATTERN.test(email.trim()) || email.length > 120) throw new ApiError(400, 'সঠিক ইমেইল দাও');
  if (password.length < 6) {
    throw new ApiError(400, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }
  if (password.length > 72) throw new ApiError(400, 'পাসওয়ার্ড সর্বোচ্চ ৭২ অক্ষরের হতে পারবে');
  if (await User.findOne({ email: email.trim().toLowerCase() })) {
    throw new ApiError(409, 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে');
  }

  const owner = isOwnerEmail(email);
  const user = await User.create({
    name,
    email,
    password,
    role: owner ? 'teacher' : 'student',
    teacherRequest: !owner && wantsTeacher ? 'pending' : 'none',
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new ApiError(400, 'ইমেইল ও পাসওয়ার্ড দিতে হবে');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'ইমেইল বা পাসওয়ার্ড ভুল');
  }

  // মূল শিক্ষকের অ্যাকাউন্ট আগে স্টুডেন্ট হয়ে থাকলেও লগইনে শিক্ষক হয়ে যায়
  if (isOwnerEmail(user.email) && user.role !== 'teacher') {
    user.role = 'teacher';
    user.teacherRequest = 'none';
    await user.save();
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/request-teacher
// রেজিস্টারের সময় টিক না দিয়ে থাকলে পরে শিক্ষক হওয়ার অনুরোধ পাঠানো যায়
export const requestTeacher = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role === 'teacher') throw new ApiError(400, 'তুমি আগে থেকেই শিক্ষক');
  if (user.teacherRequest === 'pending') throw new ApiError(400, 'অনুরোধ আগেই পাঠানো হয়েছে, অনুমোদনের অপেক্ষা করো');

  user.teacherRequest = 'pending';
  await user.save();
  res.json({ user: publicUser(user) });
});
