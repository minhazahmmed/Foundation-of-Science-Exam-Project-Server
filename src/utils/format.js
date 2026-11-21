import { isOwnerEmail } from './owner.js';

// স্টুডেন্টকে প্রশ্ন পাঠানোর সময় সঠিক উত্তর আর ব্যাখ্যা বাদ দেওয়া হয়
export const toStudentQuestion = (q) => ({
  _id: q._id,
  text: q.text,
  image: q.image,
  passage: q.passage,
  passageImage: q.passageImage,
  board: q.board,
  options: q.options,
  optionStyle: q.optionStyle || 'bn',
});

// পরীক্ষা শেষের রেজাল্টে এবং টিচারের জন্য পুরো প্রশ্ন
export const toFullQuestion = (q) => ({
  _id: q._id,
  text: q.text,
  image: q.image,
  passage: q.passage,
  passageImage: q.passageImage,
  board: q.board,
  options: q.options,
  optionStyle: q.optionStyle || 'bn',
  correctIndex: q.correctIndex,
  explanation: q.explanation,
  explanationImage: q.explanationImage,
  classLevel: q.classLevel || '',
  subject: q.subject,
  chapter: q.chapter,
  serial: q.serial || 0,
});

export const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isOwner: user.role === 'teacher' && isOwnerEmail(user.email),
  teacherRequest: user.teacherRequest || 'none',
});