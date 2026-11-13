import ApiError from './ApiError.js';

// সংখ্যা পড়ে এবং সীমার মধ্যে আছে কিনা দেখে। মান না থাকলে fallback দেয়, fallback না থাকলে error।
export function readNumber(value, label, { min, max, fallback }) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new ApiError(400, `${label} দিতে হবে`);
  }
  const n = Number(value);
  if (Number.isNaN(n) || n < min || n > max) {
    throw new ApiError(400, `${label} ${min} থেকে ${max} এর মধ্যে হতে হবে`);
  }
  return n;
}

// null মানে "উত্তর দেয়নি"। নাহলে 0 থেকে 3
export function readSelectedIndex(value) {
  if (value === null || value === undefined) return null;
  if (Number.isInteger(value) && value >= 0 && value <= 3) return value;
  throw new ApiError(400, 'অপশন নম্বর ০ থেকে ৩ এর মধ্যে হতে হবে');
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
