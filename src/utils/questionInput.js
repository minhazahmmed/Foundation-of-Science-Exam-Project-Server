import ApiError from './ApiError.js';

export const LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

// ফর্ম থেকে আসা বা ছবি থেকে বানানো JSON, দুটোই এই একটা ফাংশন দিয়ে পরিষ্কার হয়।
// মানে text/question দুই নামই চলবে, অপশন সাধারণ লেখা বা {text, image} দুটোই চলবে,
// আর সঠিক উত্তর correctIndex (0-3) বা "ক/খ/গ/ঘ" অক্ষরে দেওয়া যাবে।
export function buildQuestionData(input = {}) {
  const text = String(input.text ?? input.question ?? '').trim();
  const image = input.image || '';
  if (!text && !image) {
    throw new ApiError(400, 'প্রশ্নের লেখা বা ছবি দিতে হবে');
  }

  const options = readOptions(input.options);
  const correctIndex = readCorrectIndex(input);

  return {
    text,
    image,
    passage: String(input.passage ?? '').trim(),
    passageImage: input.passageImage || '',
    options,
    correctIndex,
    explanation: String(input.explanation ?? '').trim(),
    explanationImage: input.explanationImage || '',
    subject: String(input.subject ?? '').trim(),
    chapter: String(input.chapter ?? '').trim(),
    board: String(input.board ?? '').trim(),
  };
}

function readOptions(raw) {
  if (!Array.isArray(raw) || raw.length !== 4) {
    throw new ApiError(400, 'ঠিক ৪টা অপশন দিতে হবে');
  }

  const options = raw.map((item) =>
    typeof item === 'string'
      ? { text: item.trim(), image: '' }
      : { text: String(item?.text ?? '').trim(), image: item?.image || '' }
  );

  options.forEach((option, i) => {
    if (!option.text && !option.image) {
      throw new ApiError(400, `অপশন ${LETTERS[i]} খালি`);
    }
  });

  // দুটো অপশন হুবহু এক হলে আটকে দেওয়া হয় (বইয়ের ছাপার ভুল ধরার জন্য)
  const seen = new Map();
  options.forEach((option, i) => {
    if (!option.text) return;
    const key = option.text.replace(/\s+/g, '');
    if (seen.has(key)) {
      throw new ApiError(400, `অপশন ${LETTERS[seen.get(key)]} ও ${LETTERS[i]} হুবহু এক`);
    }
    seen.set(key, i);
  });

  return options;
}

function readCorrectIndex(input) {
  let index = -1;
  if (Number.isInteger(input.correctIndex)) {
    index = input.correctIndex;
  } else if (typeof input.answer === 'string') {
    index = LETTERS.indexOf(input.answer.trim());
  }
  if (index < 0 || index > 3) {
    throw new ApiError(400, 'সঠিক উত্তর ঠিক করা নেই');
  }
  return index;
}
