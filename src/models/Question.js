import mongoose from 'mongoose';

// প্রতিটা অপশনে লেখা, ছবি, বা দুটোই থাকতে পারে
const optionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: '' }, // সমীকরণ থাকলে $...$ এর ভেতরে LaTeX
    image: { type: String, default: '' },
    passage: { type: String, trim: true, default: '' }, // উদ্দীপক / অনুচ্ছেদ
    passageImage: { type: String, default: '' }, // উদ্দীপকের চিত্র
    options: { type: [optionSchema], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 }, // 0=ক, 1=খ, 2=গ, 3=ঘ
    explanation: { type: String, trim: true, default: '' }, // ব্যাখ্যা বা সমাধান (লেখা)
    explanationImage: { type: String, default: '' }, // সমাধানের ছবি
    optionStyle: { type: String, enum: ['bn', 'en'], default: 'bn' }, // অপশনের চিহ্ন: bn = ক খ গ ঘ, en = A B C D
    classLevel: { type: String, trim: true, default: '' }, // শ্রেণি, যেমন "সপ্তম" বা "একাদশ"
    subject: { type: String, trim: true, default: '' },
    chapter: { type: String, trim: true, default: '' },
    serial: { type: Number, default: 0, min: 0 }, // শ্রেণি + বিষয় + অধ্যায়ের ভেতরে প্রশ্নের ক্রমিক নম্বর (১, ২, ৩ ...)
    board: { type: String, trim: true, default: '' }, // যেমন "ঢা. বো. ২০১৫"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

questionSchema.index({ createdBy: 1, classLevel: 1, subject: 1, chapter: 1, serial: 1 });

export default mongoose.model('Question', questionSchema);