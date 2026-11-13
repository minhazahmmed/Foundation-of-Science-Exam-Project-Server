import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { toFullQuestion } from '../utils/format.js';
import { buildQuestionData } from '../utils/questionInput.js';
import { escapeRegex } from '../utils/validate.js';

// নিজের প্রশ্ন খুঁজে বের করে, না পেলে 404
async function findOwnQuestion(id, teacherId) {
  const question = await Question.findOne({ _id: id, createdBy: teacherId });
  if (!question) throw new ApiError(404, 'প্রশ্ন পাওয়া যায়নি');
  return question;
}

// GET /api/questions?chapter=&subject=&search=&page=&limit=
export const listQuestions = asyncHandler(async (req, res) => {
  const { chapter, subject, search } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const filter = { createdBy: req.user._id };
  if (chapter) filter.chapter = chapter;
  if (subject) filter.subject = subject;
  if (search) filter.text = new RegExp(escapeRegex(search), 'i');

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  res.json({
    questions: questions.map(toFullQuestion),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/questions/chapters  (ফিল্টারের ড্রপডাউনের জন্য)
export const listChapters = asyncHandler(async (req, res) => {
  const chapters = await Question.distinct('chapter', { createdBy: req.user._id });
  res.json({ chapters: chapters.filter(Boolean).sort() });
});

// GET /api/questions/:id
export const getQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnQuestion(req.params.id, req.user._id);
  res.json({ question: toFullQuestion(question) });
});

// POST /api/questions
export const createQuestion = asyncHandler(async (req, res) => {
  const data = buildQuestionData(req.body);
  const question = await Question.create({ ...data, createdBy: req.user._id });
  res.status(201).json({ question: toFullQuestion(question) });
});

// POST /api/questions/bulk
// body: { chapter?, subject?, questions: [...] }
// ছবি থেকে বানানো JSON এখানে সরাসরি পাঠানো যায়। একটাও ভুল থাকলে কোনোটাই সেভ হয় না।
export const createManyQuestions = asyncHandler(async (req, res) => {
  const { questions, chapter = '', subject = '' } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ApiError(400, 'প্রশ্নের তালিকা দিতে হবে');
  }
  if (questions.length > 200) {
    throw new ApiError(400, 'একবারে সর্বোচ্চ ২০০টা প্রশ্ন দেওয়া যাবে');
  }

  const docs = [];
  const errors = [];

  questions.forEach((item, i) => {
    try {
      const data = buildQuestionData({ chapter, subject, ...item });
      docs.push({ ...data, createdBy: req.user._id });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      errors.push({ no: item?.no ?? i + 1, message: err.message });
    }
  });

  if (errors.length) {
    throw new ApiError(400, `${errors.length}টা প্রশ্নে সমস্যা আছে, কিছুই সেভ হয়নি`, errors);
  }

  const created = await Question.insertMany(docs);
  res.status(201).json({ created: created.length, questions: created.map(toFullQuestion) });
});

// PUT /api/questions/:id
// যে পরীক্ষাগুলোতে এই প্রশ্ন আছে তাদের সংখ্যা ফেরত দেয়, যাতে টিচার "regrade" চাপতে মনে রাখে
export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnQuestion(req.params.id, req.user._id);
  question.set(buildQuestionData(req.body));
  await question.save();

  const usedInExams = await Exam.countDocuments({ questions: question._id });
  res.json({ question: toFullQuestion(question), usedInExams });
});

// DELETE /api/questions/:id
export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnQuestion(req.params.id, req.user._id);
  if (await Exam.exists({ questions: question._id })) {
    throw new ApiError(409, 'এই প্রশ্ন কোনো পরীক্ষায় আছে, তাই মোছা যাবে না');
  }
  await question.deleteOne();
  res.json({ message: 'প্রশ্ন মোছা হয়েছে' });
});
