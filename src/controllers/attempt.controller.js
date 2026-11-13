import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import User from '../models/User.js';
import { gradeAnswers } from '../services/grading.service.js';
import { saveAnswer, submitAttempt, submitIfExpired } from '../services/attempt.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toFullQuestion, toStudentQuestion } from '../utils/format.js';
import { readSelectedIndex } from '../utils/validate.js';

// উত্তর সেভ করার সময় ইন্টারনেটের দেরির জন্য এই কয়েক সেকেন্ড বাড়তি ছাড় দেওয়া হয়
const GRACE_MS = 5000;

async function findOwnAttempt(id, studentId) {
  const attempt = await Attempt.findOne({ _id: id, student: studentId });
  if (!attempt) throw new ApiError(404, 'পরীক্ষার তথ্য পাওয়া যায়নি');
  return attempt;
}

// POST /api/attempts/start/:code   (শুধু student)
// প্রথমবার হলে নতুন attempt শুরু হয়, আবার ঢুকলে আগেরটাই চলতে থাকে (সময় রিসেট হয় না)
export const startAttempt = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ code: req.params.code.toUpperCase() }).populate('questions');
  if (!exam) throw new ApiError(404, 'এই লিংকে কোনো পরীক্ষা নেই');

  const mine = { exam: exam._id, student: req.user._id };
  let attempt = await Attempt.findOne(mine);

  if (!attempt) {
    if (!exam.isActive) throw new ApiError(403, 'এই পরীক্ষা এখন বন্ধ আছে');

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);
    try {
      attempt = await Attempt.create({ ...mine, startedAt, expiresAt });
    } catch (err) {
      // দুইবার ক্লিক করলে দ্বিতীয়বার duplicate error আসে, তখন আগেরটাই নিই
      if (err.code !== 11000) throw err;
      attempt = await Attempt.findOne(mine);
    }
  }

  attempt = await submitIfExpired(attempt);
  if (attempt.status === 'submitted') {
    return res.json({ alreadySubmitted: true, attemptId: attempt._id });
  }

  res.json({
    alreadySubmitted: false,
    attemptId: attempt._id,
    expiresAt: attempt.expiresAt,
    serverNow: new Date(), // ক্লায়েন্ট এটা দিয়ে নিজের ঘড়ির পার্থক্য ধরে টাইমার ঠিক রাখবে
    exam: { title: exam.title, durationMinutes: exam.durationMinutes },
    questions: exam.questions.map(toStudentQuestion),
    savedAnswers: attempt.answers,
  });
});

// PATCH /api/attempts/:id/answer   body: { questionId, selectedIndex }
// প্রতিবার অপশন বাছলে এটা ডাকা হবে, তাই পেজ রিফ্রেশ করলেও উত্তর হারায় না
export const answerQuestion = asyncHandler(async (req, res) => {
  const attempt = await findOwnAttempt(req.params.id, req.user._id);
  if (attempt.status === 'submitted') throw new ApiError(409, 'পরীক্ষা জমা হয়ে গেছে');

  if (Date.now() > attempt.expiresAt.getTime() + GRACE_MS) {
    await submitAttempt(attempt);
    throw new ApiError(409, 'সময় শেষ, পরীক্ষা জমা হয়ে গেছে');
  }

  const { questionId } = req.body;
  const selectedIndex = readSelectedIndex(req.body.selectedIndex);

  const exam = await Exam.findById(attempt.exam).select('questions');
  if (!exam.questions.some((id) => String(id) === String(questionId))) {
    throw new ApiError(400, 'এই প্রশ্ন এই পরীক্ষার নয়');
  }

  await saveAnswer(attempt._id, questionId, selectedIndex);
  res.json({ saved: true });
});

// POST /api/attempts/:id/submit   (body তে শেষ মুহূর্তের answers: [{questionId, selectedIndex}] দেওয়া যায়)
export const submitExam = asyncHandler(async (req, res) => {
  let attempt = await findOwnAttempt(req.params.id, req.user._id);
  if (attempt.status === 'submitted') {
    return res.json({ attemptId: attempt._id, alreadySubmitted: true });
  }

  const inTime = Date.now() <= attempt.expiresAt.getTime() + GRACE_MS;
  if (inTime && Array.isArray(req.body.answers)) {
    for (const item of req.body.answers) {
      await saveAnswer(attempt._id, item.questionId, readSelectedIndex(item.selectedIndex));
    }
    attempt = await findOwnAttempt(req.params.id, req.user._id); // নতুন উত্তরসহ আবার আনা
  }

  await submitAttempt(attempt);
  res.json({ attemptId: attempt._id, alreadySubmitted: false });
});

// GET /api/attempts/mine   (স্টুডেন্টের দেওয়া সব পরীক্ষা)
export const myAttempts = asyncHandler(async (req, res) => {
  const attempts = await Attempt.find({ student: req.user._id, status: 'submitted' })
    .populate('exam', 'title code')
    .sort({ submittedAt: -1 });

  res.json({
    attempts: attempts.map((a) => ({
      attemptId: a._id,
      exam: a.exam,
      score: a.score,
      total: a.total,
      submittedAt: a.submittedAt,
    })),
  });
});

// GET /api/attempts/:id/result
// স্টুডেন্ট নিজেরটা দেখতে পারবে। টিচার শুধু নিজের পরীক্ষার attempt দেখতে পারবে।
// ফলাফল প্রতিবার বর্তমান প্রশ্ন দিয়ে হিসাব হয়, তাই প্রশ্ন ঠিক করার পর এখানে সাথে সাথে নতুন ফল দেখায়।
export const getResult = asyncHandler(async (req, res) => {
  let attempt = await Attempt.findById(req.params.id);
  if (!attempt) throw new ApiError(404, 'পরীক্ষার তথ্য পাওয়া যায়নি');

  const exam = await Exam.findById(attempt.exam).populate('questions');
  const isOwner = String(attempt.student) === String(req.user._id);
  const isExamTeacher =
    req.user.role === 'teacher' && String(exam.createdBy) === String(req.user._id);
  if (!isOwner && !isExamTeacher) throw new ApiError(403, 'এই ফলাফল দেখার অনুমতি নেই');

  attempt = await submitIfExpired(attempt);
  if (attempt.status !== 'submitted') throw new ApiError(409, 'পরীক্ষা এখনো শেষ হয়নি');

  const grade = gradeAnswers({
    questions: exam.questions,
    answers: attempt.answers,
    marksPerQuestion: exam.marksPerQuestion,
    negativeMark: exam.negativeMark,
  });

  const student = isExamTeacher
    ? await User.findById(attempt.student).select('name email')
    : undefined;

  res.json({
    exam: { title: exam.title },
    student,
    submittedAt: attempt.submittedAt,
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
