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

// একই শ্রেণি + বিষয় + অধ্যায়ের ভেতরে এখন সবচেয়ে বড় ক্রমিক নম্বর (না থাকলে ০)
async function maxSerial(teacherId, { classLevel, subject, chapter }) {
  const [top] = await Question.find({ createdBy: teacherId, classLevel, subject, chapter })
    .sort({ serial: -1 })
    .limit(1)
    .select('serial');
  return top?.serial || 0;
}

// GET /api/questions?classLevel=&subject=&chapter=&search=&page=&limit=
export const listQuestions = asyncHandler(async (req, res) => {
  // কুয়েরির মান অবজেক্ট হয়ে ফিল্টারে ঢুকতে পারে ({"$ne": ""} ধরনের), তাই সবসময় লেখায় বদলে নেওয়া হয়
  const chapter = typeof req.query.chapter === 'string' ? req.query.chapter : '';
  const classLevel = typeof req.query.classLevel === 'string' ? req.query.classLevel : '';
  const subject = typeof req.query.subject === 'string' ? req.query.subject : '';
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const filter = { createdBy: req.user._id };
  if (classLevel) filter.classLevel = classLevel;
  if (chapter) filter.chapter = chapter;
  if (subject) filter.subject = subject;
  if (search) filter.text = new RegExp(escapeRegex(search), 'i');

  const [questions, total] = await Promise.all([
    Question.find(filter)
      // শ্রেণি → বিষয় → অধ্যায় → ক্রমিক নম্বর। নম্বর একই হলে আগে যোগ করাটা আগে
      .sort({ classLevel: 1, subject: 1, chapter: 1, serial: 1, createdAt: 1, _id: 1 })
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
  const [chapters, classes] = await Promise.all([
    Question.distinct('chapter', { createdBy: req.user._id }),
    Question.distinct('classLevel', { createdBy: req.user._id }),
  ]);
  res.json({ chapters: chapters.filter(Boolean).sort(), classes: classes.filter(Boolean).sort() });
});

// GET /api/questions/filters  (শ্রেণি, বিষয়, অধ্যায়ের যত মিলিত তালিকা আছে সব)
export const listFilters = asyncHandler(async (req, res) => {
  const groups = await Question.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: { classLevel: '$classLevel', subject: '$subject', chapter: '$chapter' }, count: { $sum: 1 } } },
    { $sort: { '_id.classLevel': 1, '_id.subject': 1, '_id.chapter': 1 } },
  ]);
  res.json({
    groups: groups.map((g) => ({
      classLevel: g._id.classLevel || '',
      subject: g._id.subject || '',
      chapter: g._id.chapter || '',
      count: g.count,
    })),
  });
});

// GET /api/questions/:id
export const getQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnQuestion(req.params.id, req.user._id);
  res.json({ question: toFullQuestion(question) });
});

// POST /api/questions
export const createQuestion = asyncHandler(async (req, res) => {
  const data = buildQuestionData(req.body);
  if (data.serial === undefined) data.serial = (await maxSerial(req.user._id, data)) + 1;
  const question = await Question.create({ ...data, createdBy: req.user._id });
  res.status(201).json({ question: toFullQuestion(question) });
});

// POST /api/questions/bulk
// body: { chapter?, subject?, questions: [...] }
// ছবি থেকে বানানো JSON এখানে সরাসরি পাঠানো যায়। একটাও ভুল থাকলে কোনোটাই সেভ হয় না।
export const createManyQuestions = asyncHandler(async (req, res) => {
  const { questions, chapter = '', subject = '', classLevel = '' } = req.body;
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
      const data = buildQuestionData({ classLevel, chapter, subject, ...item, serial: undefined });
      docs.push({ ...data, createdBy: req.user._id });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      errors.push({ no: item?.no ?? i + 1, message: err.message });
    }
  });

  if (errors.length) {
    throw new ApiError(400, `${errors.length}টা প্রশ্নে সমস্যা আছে, কিছুই সেভ হয়নি`, errors);
  }

  // নম্বর বসে তালিকার ক্রমে, আগে যা আছে তার পর থেকে। এতে ১০টা ছবি দুই দফায় দিলেও নম্বর ঠিক থাকে।
  const base = await maxSerial(req.user._id, docs[0]);
  docs.forEach((doc, i) => {
    doc.serial = base + i + 1;
  });

  // insertMany এর সময় একই মুহূর্তের createdAt এ ক্রম এলোমেলো হতো, তাই এক এক করে বসানো হয়
  const created = [];
  for (const doc of docs) created.push(await Question.create(doc));
  res.status(201).json({ created: created.length, questions: created.map(toFullQuestion) });
});

// PUT /api/questions/:id
// যে পরীক্ষাগুলোতে এই প্রশ্ন আছে তাদের সংখ্যা ফেরত দেয়, যাতে টিচার "regrade" চাপতে মনে রাখে
export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnQuestion(req.params.id, req.user._id);
  const data = buildQuestionData(req.body);
  const moved = ['classLevel', 'subject', 'chapter'].some((key) => data[key] !== (question[key] || ''));
  // অন্য অধ্যায়ে সরালে আর নম্বর না দিলে নতুন জায়গার শেষ নম্বর বসে। নম্বর না দিলে আগেরটাই থাকে।
  if (data.serial === undefined) data.serial = moved ? (await maxSerial(req.user._id, data)) + 1 : question.serial;
  question.set(data);
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