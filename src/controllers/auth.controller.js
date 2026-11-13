import { env } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { publicUser } from '../utils/format.js';
import { signToken } from '../utils/token.js';

// POST /api/auth/register
// teacherCode (.env এর TEACHER_SECRET) ঠিক দিলে teacher, না দিলে student
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, teacherCode } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'নাম, ইমেইল ও পাসওয়ার্ড দিতে হবে');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    throw new ApiError(409, 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে');
  }

  let role = 'student';
  if (teacherCode) {
    if (!env.teacherSecret || teacherCode !== env.teacherSecret) {
      throw new ApiError(403, 'টিচার কোড ঠিক নয়');
    }
    role = 'teacher';
  }

  const user = await User.create({ name, email, password, role });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'ইমেইল ও পাসওয়ার্ড দিতে হবে');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'ইমেইল বা পাসওয়ার্ড ভুল');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
