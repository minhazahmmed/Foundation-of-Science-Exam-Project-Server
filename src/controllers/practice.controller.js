import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import Practice from '../models/Practice.js';
import { gradeAnswers } from '../services/grading.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toFullQuestion, toStudentQuestion } from '../utils/format.js';
import { readSelectedIndex } from '../utils/validate.js';

// একজন স্টুডেন্টের একটা পরীক্ষার জন্য সর্বোচ্চ এতগুলো অনুশীলন জমা থাকে, পুরনোগুলো মুছে যায়
const KEEP_LAST = 50;

// অনুশীলন শুধু সেই পরীক্ষার, যেটা স্টুডেন্ট নিজে আগে জমা দিয়েছে
async function findSubmittedAttempt(attemptId, studentId) {
  const attempt = await Attempt.findOne({ _id: attemptId, student: studentId });
  if (!attempt) throw new ApiError(404, 'পরীক্ষার তথ্য পাওয়া যায়নি');
  if (attempt.status !== 'submitted') throw new ApiError(409, 'আগে মূল পরীক্ষাটা জমা দাও, তারপর অনুশীলন করতে পারবে');
  return attempt;
}

const summary = (p) => ({
  practiceId: p._id,
  score: p.score,
  total: p.total,
  correctCount: p.correctCount,
  wrongCount: p.wrongCount,
  skippedCount: p.skippedCount,
  seconds: p.seconds,
  submittedAt: p.createdAt,
});

// GET /api/practice/start/:attemptId  (প্রশ্নের তালিকা, সঠিক উত্তর ছাড়া)
export const startPractice = asyncHandler(async (req, res) => {
  const attempt = await findSubmittedAttempt(req.params.attemptId, req.user._id);
  const exam = await Exam.findById(attempt.exam).populate('questions');
  if (!exam) throw new ApiError(404, 'এই পরীক্ষাটা আর নেই');

  res.json({
    attemptId: attempt._id,
    exam: { title: exam.title, durationMinutes: exam.durationMinutes },
    questions: exam.questions.map(toStudentQuestion),
  });
});

// POST /api/practice/:attemptId/submit   body: { answers: [{questionId, selectedIndex}], seconds }
export const submitPractice = asyncHandler(async (req, res) => {
  const attempt = await findSubmittedAttempt(req.params.attemptId, req.user._id);
  const exam = await Exam.findById(attempt.exam).populate('questions');
  if (!exam) throw new ApiError(404, 'এই পরীক্ষাটা আর নেই');

  const allowed = new Set(exam.questions.map((q) => String(q._id)));
  const list = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (list.length > allowed.size) throw new ApiError(400, 'উত্তরের সংখ্যা প্রশ্নের চেয়ে বেশি');

  const answers = list.map((item) => {
    if (!allowed.has(String(item?.questionId))) throw new ApiError(400, 'এই প্রশ্ন এই পরীক্ষার নয়');
    return { question: String(item.questionId), selectedIndex: readSelectedIndex(item.selectedIndex) };
  });

  const grade = gradeAnswers({
    questions: exam.questions,
    answers,
    marksPerQuestion: exam.marksPerQuestion,
    negativeMark: exam.negativeMark,
  });

  const seconds = Math.min(Math.max(Math.round(Number(req.body.seconds) || 0), 0), 24 * 3600);
  const practice = await Practice.create({
    exam: exam._id,
    student: req.user._id,
    attempt: attempt._id,
    answers,
    score: grade.score,
    total: grade.total,
    correctCount: grade.correctCount,
    wrongCount: grade.wrongCount,
    skippedCount: grade.skippedCount,
    seconds,
  });

  // পুরনো অনুশীলন ছেঁটে ফেলা
  const old = await Practice.find({ attempt: attempt._id, student: req.user._id })
    .sort({ createdAt: -1 })
    .skip(KEEP_LAST)
    .select('_id');
  if (old.length > 0) await Practice.deleteMany({ _id: { $in: old.map((p) => p._id) } });

  res.status(201).json({ practiceId: practice._id });
});

// GET /api/practice/result/:practiceId  (প্রশ্ন, উত্তর ও ব্যাখ্যাসহ)
export const getPracticeResult = asyncHandler(async (req, res) => {
  const practice = await Practice.findOne({ _id: req.params.practiceId, student: req.user._id });
  if (!practice) throw new ApiError(404, 'অনুশীলনের তথ্য পাওয়া যায়নি');

  const exam = await Exam.findById(practice.exam).populate('questions');
  if (!exam) throw new ApiError(404, 'এই পরীক্ষাটা আর নেই');

  // প্রশ্ন পরে ঠিক করা হলে নতুন উত্তর ধরেই হিসাব হয়
  const grade = gradeAnswers({
    questions: exam.questions,
    answers: practice.answers,
    marksPerQuestion: exam.marksPerQuestion,
    negativeMark: exam.negativeMark,
  });

  res.json({
    attemptId: practice.attempt,
    exam: { title: exam.title },
    submittedAt: practice.createdAt,
    seconds: practice.seconds,
    score: grade.score,
    total: grade.total,
    correctCount: grade.correctCount,
    wrongCount: grade.wrongCount,
    skippedCount: grade.skippedCount,
    questions: exam.questions.map((q, i) => ({
      ...toFullQuestion(q),
      selectedIndex: grade.details[i].selectedIndex,
      status: grade.details[i].status,
    })),
  });
});

// GET /api/practice/progress/:attemptId  (মূল পরীক্ষার ফল আর সব অনুশীলনের তালিকা, পুরনো থেকে নতুন)
export const getProgress = asyncHandler(async (req, res) => {
  const attempt = await findSubmittedAttempt(req.params.attemptId, req.user._id);
  const exam = await Exam.findById(attempt.exam).select('title');
  const practices = await Practice.find({ attempt: attempt._id, student: req.user._id }).sort({ createdAt: 1 });

  res.json({
    attemptId: attempt._id,
    exam: { title: exam?.title ?? '' },
    official: { score: attempt.score, total: attempt.total, submittedAt: attempt.submittedAt },
    practices: practices.map(summary),
  });
});
