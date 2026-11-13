import crypto from 'crypto';

// 0, O, 1, I, L বাদ দেওয়া হয়েছে যাতে কোড পড়তে ভুল না হয়
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}
