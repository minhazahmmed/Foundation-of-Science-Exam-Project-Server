import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'পরীক্ষার নাম দিতে হবে'], trim: true },
    code: { type: String, required: true, unique: true, uppercase: true }, // লিংকে থাকে: /exam/ABC123
    // প্রশ্নের কপি না রেখে ব্যাংকের সাথে লিংক রাখা হয়েছে, তাই প্রশ্ন ঠিক করলে সব পরীক্ষায় ঠিক হয়
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    durationMinutes: { type: Number, required: true, min: 1 },
    marksPerQuestion: { type: Number, default: 1 },
    negativeMark: { type: Number, default: 0 }, // ভুল উত্তরে কাটা নম্বর
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Exam', examSchema);
