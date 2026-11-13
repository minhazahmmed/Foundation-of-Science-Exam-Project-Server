import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:1/none';
process.env.JWT_SECRET = 'test';
process.env.GEMINI_API_KEY = 'fake-key';

const { parseQuestionNumbers } = await import('../src/utils/parseQuestionNumbers.js');
const { arrangeExtracted } = await import('../src/utils/arrangeExtracted.js');
const { buildPrompt, extractQuestionsFromImages } = await import('../src/services/gemini.service.js');

// ---------- প্রশ্নের নম্বর পড়া ----------
test('parses english and bangla numbers, ranges and keeps typed order', () => {
  assert.deepEqual(parseQuestionNumbers('1, 2, 5-7'), [1, 2, 5, 6, 7]);
  assert.deepEqual(parseQuestionNumbers('৩৪, ৩৫, ৪০-৪২'), [34, 35, 40, 41, 42]);
  assert.deepEqual(parseQuestionNumbers('৫ থেকে ৮'), [5, 6, 7, 8]);
  assert.deepEqual(parseQuestionNumbers('9, 3, 9, 1 - 2'), [9, 3, 1, 2]);
  assert.deepEqual(parseQuestionNumbers('34 35 36'), [34, 35, 36]);
  assert.deepEqual(parseQuestionNumbers(''), []);
});

test('rejects unreadable, reversed, zero and too many numbers', () => {
  assert.throws(() => parseQuestionNumbers('abc'), /বোঝা যাচ্ছে না/);
  assert.throws(() => parseQuestionNumbers('9-5'), /উল্টো ক্রমে/);
  assert.throws(() => parseQuestionNumbers('0, 1'), /১ বা তার বেশি/);
  assert.throws(() => parseQuestionNumbers('1-150'), /সর্বোচ্চ/);
});

// ---------- ক্রম সাজানো ----------
const raw = [
  { bookNo: 34, question: 'q34', options: ['a', 'b', 'c', 'd'], answer: 'ক', board: '', passage: '' },
  { bookNo: '৩৫', question: 'q35', options: ['a', 'b', 'c', 'd'], answer: 'গ', answerGuessed: true },
  { bookNo: 36, question: 'q36', options: ['a', 'b', 'c', 'd'], answer: null, answerGuessed: true },
  { bookNo: 37, question: 'q37', options: ['a', 'b', 'c', 'd'], answer: 'ঙ' },
];

test('all mode keeps image order and numbers from 1', () => {
  const { questions, missing } = arrangeExtracted(raw, null);
  assert.deepEqual(questions.map((q) => [q.no, q.bookNo]), [[1, 34], [2, 35], [3, 36], [4, 37]]);
  assert.deepEqual(missing, []);
});

test('selected mode follows typed order, serial starts at 1, reports missing', () => {
  const { questions, missing } = arrangeExtracted(raw, [35, 34, 99]);
  assert.deepEqual(questions.map((q) => [q.no, q.bookNo, q.question]), [[1, 35, 'q35'], [2, 34, 'q34']]);
  assert.deepEqual(missing, [99]);
});

test('cleans answers: bad letter becomes null, guessed flag only with an answer', () => {
  const { questions } = arrangeExtracted(raw, null);
  assert.equal(questions[1].answerGuessed, true);
  assert.equal(questions[2].answer, null);
  assert.equal(questions[2].answerGuessed, false);
  assert.equal(questions[3].answer, null);
});

// ---------- প্রম্পট ----------
test('prompt includes chosen numbers and the unmarked-answer rule', () => {
  const selected = buildPrompt({ numbers: [34, 40], solveIfUnmarked: false });
  assert.match(selected, /34, 40/);
  assert.match(selected, /"answer" এ null দাও/);

  const all = buildPrompt({ numbers: null, solveIfUnmarked: true });
  assert.match(all, /সবগুলো বের করো/);
  assert.match(all, /answerGuessed/);
});

// ---------- নকল Gemini client দিয়ে সার্ভিস ----------
const image = { buffer: Buffer.from('fake'), mimeType: 'image/jpeg' };

test('service sends images + prompt with JSON mode and returns parsed list', async () => {
  let sent;
  const fake = {
    models: {
      generateContent: async (args) => {
        sent = args;
        return { text: JSON.stringify([{ bookNo: 1, question: 'q', options: ['a', 'b', 'c', 'd'], answer: 'খ' }]) };
      },
    },
  };
  const list = await extractQuestionsFromImages({ images: [image, image], numbers: [1] }, fake);

  assert.equal(list.length, 1);
  assert.equal(sent.config.responseMimeType, 'application/json');
  assert.equal(sent.config.temperature, 0);
  const parts = sent.contents[0].parts;
  assert.equal(parts.filter((p) => p.inlineData).length, 2);
  assert.equal(parts[0].inlineData.data, Buffer.from('fake').toString('base64'));
  assert.ok(parts.at(-1).text.includes('1'));
});

test('service turns Gemini failures into friendly errors', async () => {
  const failWith = (err) => ({ models: { generateContent: async () => { throw err; } } });
  const run = (err) => extractQuestionsFromImages({ images: [image] }, failWith(err));

  await assert.rejects(run(Object.assign(new Error('quota'), { status: 429 })), /ফ্রি সীমা/);
  await assert.rejects(run(Object.assign(new Error('bad'), { status: 403 })), /GEMINI_API_KEY ঠিক নয়/);
  await assert.rejects(run(Object.assign(new Error('nf'), { status: 404 })), /GEMINI_MODEL/);

  const notJson = { models: { generateContent: async () => ({ text: 'sorry I cannot' }) } };
  await assert.rejects(extractQuestionsFromImages({ images: [image] }, notJson), /পড়া যায়নি/);
});
