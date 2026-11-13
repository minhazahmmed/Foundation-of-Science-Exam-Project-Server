import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import { gradeAnswers } from './grading.service.js';

const gradeFields = (result) => ({
  score: result.score,
  total: result.total,
  correctCount: result.correctCount,
  wrongCount: result.wrongCount,
  skippedCount: result.skippedCount,
});

// স্কোর হিসাব করে attempt "submitted" করে দেয়
export async function submitAttempt(attempt) {
  if (attempt.status === 'submitted') return attempt;

  const exam = await Exam.findById(attempt.exam).populate('questions');
  const result = gradeAnswers({
    questions: exam.questions,
    answers: attempt.answers,
    marksPerQuestion: exam.marksPerQuestion,
    negativeMark: exam.negativeMark,
  });

  // সময় পার হয়ে গেলে জমার সময় হিসেবে সময়ের শেষটাই ধরা হয়
  const submittedAt = new Date(Math.min(Date.now(), attempt.expiresAt.getTime()));
  attempt.set({ ...gradeFields(result), status: 'submitted', submittedAt });
  await attempt.save();
  return attempt;
}

// সময় শেষ হয়ে গেলে নিজে থেকে জমা করে নেয়। স্টুডেন্ট ব্রাউজার বন্ধ করে দিলেও কাজ হয়।
export async function submitIfExpired(attempt) {
  const expired = Date.now() > attempt.expiresAt.getTime();
  if (attempt.status === 'in_progress' && expired) {
    return submitAttempt(attempt);
  }
  return attempt;
}

// একটা উত্তর সেভ করে। আগে থেকে থাকলে বদলায়, না থাকলে যোগ করে।
export async function saveAnswer(attemptId, questionId, selectedIndex) {
  const updated = await Attempt.updateOne(
    { _id: attemptId, 'answers.question': questionId },
    { $set: { 'answers.$.selectedIndex': selectedIndex } }
  );
  if (updated.matchedCount === 0) {
    await Attempt.updateOne(
      { _id: attemptId },
      { $push: { answers: { question: questionId, selectedIndex } } }
    );
  }
}

// প্রশ্নের উত্তর বা নম্বর ঠিক করার পর সবার স্কোর নতুন করে হিসাব করে
export async function regradeExamAttempts(exam) {
  const attempts = await Attempt.find({ exam: exam._id, status: 'submitted' });

  for (const attempt of attempts) {
    const result = gradeAnswers({
      questions: exam.questions,
      answers: attempt.answers,
      marksPerQuestion: exam.marksPerQuestion,
      negativeMark: exam.negativeMark,
    });
    attempt.set(gradeFields(result));
    await attempt.save();
  }
  return attempts.length;
}
