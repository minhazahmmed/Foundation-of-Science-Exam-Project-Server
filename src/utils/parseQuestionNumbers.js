import ApiError from './ApiError.js';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

// ৩৪ -> 34
export const toEnglishDigits = (text) =>
  String(text ?? '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

const MAX_NUMBERS = 100;

// "৩৪, ৩৫, 40-43, ৫০ থেকে ৫২" -> [34, 35, 40, 41, 42, 43, 50, 51, 52]
// বাংলা বা ইংরেজি যেকোনো অঙ্কে লেখা যায়। যে ক্রমে লেখা হয়েছে সেই ক্রমই থাকে, একই নম্বর দুবার দিলে একবার ধরা হয়।
export function parseQuestionNumbers(input) {
  const text = toEnglishDigits(input)
    .replace(/\s*(থেকে|[-–—~])\s*/g, '-') // "5 থেকে 9" আর "5 - 9" দুটোই রেঞ্জ
    .trim();
  if (!text) return [];

  const numbers = [];
  const seen = new Set();
  const add = (n) => {
    if (!seen.has(n)) {
      seen.add(n);
      numbers.push(n);
    }
  };

  for (const token of text.split(/[\s,،;]+/).filter(Boolean)) {
    const single = token.match(/^(\d+)$/);
    const range = token.match(/^(\d+)-(\d+)$/);

    if (single) {
      add(Number(single[1]));
    } else if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (from > to) throw new ApiError(400, `"${token}" উল্টো ক্রমে লেখা, ছোট নম্বর আগে দাও`);
      for (let n = from; n <= to; n++) add(n);
    } else {
      throw new ApiError(400, `"${token}" নম্বরটা বোঝা যাচ্ছে না। কমা দিয়ে নম্বর লেখো, যেমন: ৩৪, ৩৫, ৪০-৪৫`);
    }

    if (numbers.length > MAX_NUMBERS) {
      throw new ApiError(400, `একবারে সর্বোচ্চ ${MAX_NUMBERS}টা প্রশ্ন বেছে নেওয়া যাবে`);
    }
  }

  if (numbers.some((n) => n < 1)) throw new ApiError(400, 'প্রশ্নের নম্বর ১ বা তার বেশি হতে হবে');
  return numbers;
}
