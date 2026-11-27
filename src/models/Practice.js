import mongoose from 'mongoose';

// পরীক্ষা দেওয়ার পর স্টুডেন্ট একই পরীক্ষা যতবার খুশি অনুশীলন করতে পারে।
// এগুলো Attempt থেকে আলাদা, তাই লিডারবোর্ড, শিক্ষকের হিসাব বা প্রশ্ন-বিশ্লেষণে কখনো ঢোকে না।
const practiceSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true },
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        selectedIndex: { type: Number, default: null },
        _id: false,
      },
    ],
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 }, // কত সময় লেগেছে
  },
  { timestamps: true }
);

practiceSchema.index({ attempt: 1, student: 1, createdAt: -1 });

export default mongoose.model('Practice', practiceSchema);
