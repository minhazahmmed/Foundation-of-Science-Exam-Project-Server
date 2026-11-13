import { env } from '../config/env.js';
import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { buildExamAnalysis } from '../services/analysis.service.js';
import { regradeExamAttempts } from '../services/attempt.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { randomCode } from '../utils/examCode.js';
import { toFullQuestion } from '../utils/format.js';
import { readNumber } from '../utils/validate.js';

const examLink = (code) => `${env.clientUrl}/exam/${code}`;

async function findOwnExam(id, teacherId) {
  const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
  if (!exam) throw new ApiError(404, 'পরীক্ষা পাওয়া যায়নি');
  return exam;
}

async function makeUniqueCode() {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    if (!(await Exam.exists({ code }))) return code;
  }
  throw new ApiError(500, 'কোড তৈরি করা যায়নি, আবার চেষ্টা করো');
}

// প্রশ্ন বেছে নেওয়ার দুটো উপায়: নিজে আইডি দেওয়া, অথবা চ্যাপ্টার থেকে র‍্যান্ডম
async function pickQuestionIds({ questionIds, random }, teacherId) {
  if (Array.isArray(questionIds) && questionIds.length) {
    const ids = [...new Set(questionIds.map(String))];
    const found = await Question.countDocuments({ _id: { $in: ids }, createdBy: teacherId });
    if (found !== ids.length) throw new ApiError(400, 'কিছু প্রশ্ন ব্যাংকে পাওয়া যায়নি');
    return ids;
  }

  if (random?.count) {
    const size = readNumber(random.count, 'প্রশ্নের সংখ্যা', { min: 1, max: 200 });
    const filter = { createdBy: teacherId };
    if (random.chapter) filter.chapter = random.chapter;
    if (random.subject) filter.subject = random.subject;

    const picked = await Question.aggregate([{ $match: filter }, { $sample: { size } }]);
    if (picked.length < size) {
      throw new ApiError(400, `ব্যাংকে মাত্র ${picked.length}টা প্রশ্ন আছে`);
    }
    return picked.map((q) => q._id);
  }

  throw new ApiError(400, 'প্রশ্ন বেছে নাও অথবা র‍্যান্ডম প্রশ্নের সংখ্যা দাও');
}

// POST /api/exams
// body: { title, durationMinutes, marksPerQuestion?, negativeMark?,
//         questionIds: [...]  অথবা  random: { count, chapter?, subject? } }
export const createExam = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) throw new ApiError(400, 'পরীক্ষার নাম দিতে হবে');

  const exam = await Exam.create({
    title,
    code: await makeUniqueCode(),
    questions: await pickQuestionIds(req.body, req.user._id),
    durationMinutes: readNumber(req.body.durationMinutes, 'সময় (মিনিট)', { min: 1, max: 300 }),
    marksPerQuestion: readNumber(req.body.marksPerQuestion, 'প্রতি প্রশ্নের নম্বর', { min: 0.1, max: 100, fallback: 1 }),
    negativeMark: readNumber(req.body.negativeMark, 'নেগেটিভ নম্বর', { min: 0, max: 10, fallback: 0 }),
    createdBy: req.user._id,
  });

  res.status(201).json({ exam, link: examLink(exam.code) });
});

// GET /api/exams  (টিচারের সব পরীক্ষা, সাথে কতজন দিয়েছে আর গড় নম্বর)
export const listExams = asyncHandler(async (req, res) => {
  const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

  const stats = await Attempt.aggregate([
    { $match: { exam: { $in: exams.map((e) => e._id) }, status: 'submitted' } },
    { $group: { _id: '$exam', submitted: { $sum: 1 }, average: { $avg: '$score' } } },
  ]);
  const statsByExam = new Map(stats.map((s) => [String(s._id), s]));

  res.json({
    exams: exams.map((exam) => {
      const s = statsByExam.get(String(exam._id));
      return {
        ...exam.toObject(),
        questionCount: exam.questions.length,
        link: examLink(exam.code),
        submittedCount: s?.submitted ?? 0,
        averageScore: s ? Math.round(s.average * 100) / 100 : 0,
      };
    }),
  });
});

// GET /api/exams/:id
export const getExam = asyncHandler(async (req, res) => {
  const exam = await (await findOwnExam(req.params.id, req.user._id)).populate('questions');
  res.json({
    exam: { ...exam.toObject(), questions: exam.questions.map(toFullQuestion) },
    link: examLink(exam.code),
  });
});

// PATCH /api/exams/:id
// নম্বর বদলালে regrade চাপতে হবে। প্রশ্নের তালিকা শুধু তখনই বদলানো যায় যখন কেউ পরীক্ষা দেয়নি।
export const updateExam = asyncHandler(async (req, res) => {
  const exam = await findOwnExam(req.params.id, req.user._id);
  const { title, durationMinutes, marksPerQuestion, negativeMark, isActive, questionIds } = req.body;

  if (title !== undefined) {
    if (!title.trim()) throw new ApiError(400, 'পরীক্ষার নাম খালি রাখা যাবে না');
    exam.title = title;
  }
  if (durationMinutes !== undefined) {
    exam.durationMinutes = readNumber(durationMinutes, 'সময় (মিনিট)', { min: 1, max: 300 });
  }
  if (marksPerQuestion !== undefined) {
    exam.marksPerQuestion = readNumber(marksPerQuestion, 'প্রতি প্রশ্নের নম্বর', { min: 0.1, max: 100 });
  }
  if (negativeMark !== undefined) {
    exam.negativeMark = readNumber(negativeMark, 'নেগেটিভ নম্বর', { min: 0, max: 10 });
  }
  if (isActive !== undefined) exam.isActive = Boolean(isActive);

  if (questionIds !== undefined) {
    if (await Attempt.exists({ exam: exam._id })) {
      throw new ApiError(409, 'কেউ পরীক্ষা শুরু করে ফেলেছে, প্রশ্নের তালিকা বদলানো যাবে না');
    }
    exam.questions = await pickQuestionIds({ questionIds }, req.user._id);
  }

  await exam.save();
  res.json({ exam, link: examLink(exam.code) });
});

// DELETE /api/exams/:id  (পরীক্ষার সব attempt-ও মুছে যায়)
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await findOwnExam(req.params.id, req.user._id);
  await Attempt.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  res.json({ message: 'পরীক্ষা মোছা হয়েছে' });
});

// GET /api/exams/public/:code  (লগইন ছাড়াই; পরীক্ষা শুরুর আগের পেজে দেখানোর জন্য)
export const getPublicInfo = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ code: req.params.code.toUpperCase() });
  if (!exam) throw new ApiError(404, 'এই লিংকে কোনো পরীক্ষা নেই');

  res.json({
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions.length,
    totalMarks: exam.questions.length * exam.marksPerQuestion,
    negativeMark: exam.negativeMark,
    isActive: exam.isActive,
  });
});

// GET /api/exams/:id/attempts  (কে কত পেল)
export const getExamAttempts = asyncHandler(async (req, res) => {
  const exam = await findOwnExam(req.params.id, req.user._id);
  const attempts = await Attempt.find({ exam: exam._id })
    .populate('student', 'name email')
    .sort({ score: -1, submittedAt: 1 });

  res.json({
    attempts: attempts.map((a) => ({
      attemptId: a._id,
      student: a.student,
      status: a.status,
      score: a.score,
      total: a.total,
      percent: a.total ? Math.round((a.score / a.total) * 100) : 0,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      skippedCount: a.skippedCount,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
  });
});

// GET /api/exams/:id/analysis  (কোন প্রশ্নে কতজন ভুল করেছে)
export const getExamAnalysis = asyncHandler(async (req, res) => {
  const exam = await (await findOwnExam(req.params.id, req.user._id)).populate('questions');
  const attempts = await Attempt.find({ exam: exam._id, status: 'submitted' });
  res.json(buildExamAnalysis(exam.questions, attempts));
});

// POST /api/exams/:id/regrade
export const regradeExam = asyncHandler(async (req, res) => {
  const exam = await (await findOwnExam(req.params.id, req.user._id)).populate('questions');
  const regraded = await regradeExamAttempts(exam);
  res.json({ message: `${regraded} জনের ফলাফল নতুন করে হিসাব হয়েছে`, regraded });
});
