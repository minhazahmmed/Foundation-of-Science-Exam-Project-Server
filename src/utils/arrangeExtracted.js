import { EN_LETTERS, LETTERS } from './questionInput.js';
import { toEnglishDigits } from './parseQuestionNumbers.js';

const text = (value) => String(value ?? '').trim();

// AI যা ফেরত দিয়েছে সেটা আমাদের প্রশ্নের আকারে গুছিয়ে নেয়
function cleanItem(raw = {}) {
  const bookNo = Number.parseInt(toEnglishDigits(raw.bookNo), 10);
  // A/B/C/D এলে ক/খ/গ/ঘ এ বদলে নেওয়া হয়, ভেতরে সবসময় ইনডেক্স দিয়েই চলে
  const given = text(raw.answer);
  const enIndex = EN_LETTERS.indexOf(given.toUpperCase());
  const answer = LETTERS.includes(given) ? given : enIndex >= 0 ? LETTERS[enIndex] : null;

  return {
    bookNo: Number.isNaN(bookNo) ? null : bookNo,
    board: text(raw.board),
    passage: text(raw.passage),
    question: text(raw.question ?? raw.text),
    options: Array.isArray(raw.options) ? raw.options.map(text) : [],
    answer, // ছবি থেকে আসা প্রশ্নে সাধারণত null থাকে, টিচার নিজে ঠিক করে দেয়
    needsImage: text(raw.needsImage),
  };
}

// numbers না দিলে (সব প্রশ্ন): ছবিতে যে ক্রমে আছে সেই ক্রমে।
// numbers দিলে: টিচার যে ক্রমে নম্বর লিখেছে সেই ক্রমে, আর ছবিতে না পাওয়া নম্বরগুলো missing এ।
// দুই ক্ষেত্রেই "no" হয় ১ থেকে শুরু করা ক্রমিক নম্বর, বইয়ের নম্বর থাকে "bookNo" এ।
export function arrangeExtracted(items, numbers = null) {
  const cleaned = items.map(cleanItem);

  let ordered = cleaned;
  const missing = [];

  if (numbers?.length) {
    const byBookNo = new Map();
    for (const q of cleaned) {
      if (q.bookNo !== null && !byBookNo.has(q.bookNo)) byBookNo.set(q.bookNo, q);
    }

    ordered = [];
    for (const n of numbers) {
      const found = byBookNo.get(n);
      if (found) ordered.push(found);
      else missing.push(n);
    }
  }

  return {
    questions: ordered.map((q, i) => ({ no: i + 1, ...q })),
    missing,
  };
}
