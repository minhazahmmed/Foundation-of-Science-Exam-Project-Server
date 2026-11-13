import mongoose from 'mongoose';

// স্টুডেন্ট কোন প্রশ্নে কোন অপশন বেছেছে। null মানে উত্তর দেয়নি।
const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedIndex: { type: Number, default: null },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [answerSchema],
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // সময় সার্ভারে ঠিক হয়, রিফ্রেশ করে বাড়ানো যায় না
    submittedAt: Date,
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
    // নিচের ফলাফল জমা দেওয়ার সময় সেভ হয়। পরে প্রশ্ন ঠিক করলে "regrade" দিয়ে নতুন করে হিসাব হয়।
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// একজন স্টুডেন্ট একটা পরীক্ষা একবারই দিতে পারবে
attemptSchema.index({ exam: 1, student: 1 }, { unique: true });

export default mongoose.model('Attempt', attemptSchema);
