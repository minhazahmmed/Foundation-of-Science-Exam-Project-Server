import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isOwnerEmail } from '../utils/owner.js';

const toRow = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  isOwner: isOwnerEmail(user.email),
});

// GET /api/teachers  → অপেক্ষায় থাকা অনুরোধ আর বর্তমান শিক্ষকদের তালিকা
export const listTeachers = asyncHandler(async (req, res) => {
  const [pending, teachers] = await Promise.all([
    User.find({ role: 'student', teacherRequest: 'pending' }).sort({ createdAt: 1 }),
    User.find({ role: 'teacher' }).sort({ createdAt: 1 }),
  ]);
  res.json({ pending: pending.map(toRow), teachers: teachers.map(toRow) });
});

async function findPending(id) {
  const user = await User.findOne({ _id: id, role: 'student', teacherRequest: 'pending' });
  if (!user) throw new ApiError(404, 'এই অনুরোধটা আর নেই');
  return user;
}

// POST /api/teachers/:id/approve
export const approveTeacher = asyncHandler(async (req, res) => {
  const user = await findPending(req.params.id);
  user.role = 'teacher';
  user.teacherRequest = 'none';
  await user.save();
  res.json({ message: `${user.name} এখন শিক্ষক` });
});

// POST /api/teachers/:id/reject
export const rejectTeacher = asyncHandler(async (req, res) => {
  const user = await findPending(req.params.id);
  user.teacherRequest = 'rejected';
  await user.save();
  res.json({ message: 'অনুরোধ বাতিল করা হয়েছে' });
});

// POST /api/teachers/:id/remove  → শিক্ষককে আবার স্টুডেন্ট বানায় (তাঁর আগের প্রশ্ন-পরীক্ষা ডাটাবেসে থেকে যায়)
export const removeTeacher = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'teacher' });
  if (!user) throw new ApiError(404, 'এই শিক্ষককে পাওয়া যায়নি');
  if (isOwnerEmail(user.email)) throw new ApiError(400, 'মূল শিক্ষককে সরানো যায় না');

  user.role = 'student';
  user.teacherRequest = 'none';
  await user.save();
  res.json({ message: `${user.name} আর শিক্ষক নন` });
});
