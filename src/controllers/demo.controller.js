import Exam from '../models/Exam.js';
import { gradeAnswers } from '../services/grading.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toFullQuestion, toStudentQuestion } from '../utils/format.js';
import { readSelectedIndex } from '../utils/validate.js';

// ডেমো পরীক্ষা ডেটাবেসে কিছুই জমা রাখে না। সময়টা আসল পরীক্ষার মতোই চলে, কিন্তু ফল শুধু ব্রাউজারে ফেরত যায়।
async function findDemo(id) {
  const exam = id.match(/^[a-f\d]{24}$/i) ? await Exam.findOne({ _id: id, isDemo: true, isActive: true }).populate('questions') : null;
  if (!exam) throw new ApiError(404, 'এই ডেমো পরীক্ষাটা পাওয়া যায়নি');
  return exam;
}

// GET /api/demo
export const listDemos = asyncHandler(async (req, res) => {
  const exams = await Exam.find({ isDemo: true, isActive: true }).sort({ updatedAt: -1 }).limit(3).select('title durationMinutes questions');
  res.json({
    exams: exams.map((e) => ({ _id: e._id, title: e.title, durationMinutes: e.durationMinutes, questionCount: e.questions.length })),
  });
});

// GET /api/demo/:id/start
export const startDemo = asyncHandler(async (req, res) => {
  const exam = await findDemo(req.params.id);
  const now = Date.now();
  res.json({
    exam: { _id: exam._id, title: exam.title, durationMinutes: exam.durationMinutes },
    questions: exam.questions.map(toStudentQuestion),
    expiresAt: new Date(now + exam.durationMinutes * 60 * 1000),
    serverNow: new Date(now),
  });
});

// POST /api/demo/:id/submit   body: { answers: [{questionId, selectedIndex}] }
export const submitDemo = asyncHandler(async (req, res) => {
  const exam = await findDemo(req.params.id);
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

  res.json({
    exam: { _id: exam._id, title: exam.title },
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
