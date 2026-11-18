import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionData } from '../src/utils/questionInput.js';

test('accepts the JSON format from the image import (question + letter answer)', () => {
  const q = buildQuestionData({
    no: 75,
    question: '$\\vec{A}$ ও $\\vec{B}$ দুটি ভেক্টর',
    options: ['i ও ii', 'i ও iii', 'ii ও iii', 'i, ii ও iii'],
    answer: 'গ',
    board: 'ঢা. বো. ২০১৯',
  });
  assert.equal(q.correctIndex, 2);
  assert.equal(q.options[0].text, 'i ও ii');
  assert.equal(q.board, 'ঢা. বো. ২০১৯');
});

test('accepts native format with correctIndex and image options', () => {
  const q = buildQuestionData({
    text: 'গ্রাফ দেখে উত্তর দাও',
    options: [{ image: 'a.png' }, { image: 'b.png' }, { text: 'গ' }, { text: 'ঘ' }],
    correctIndex: 1,
  });
  assert.equal(q.correctIndex, 1);
  assert.equal(q.options[1].image, 'b.png');
});

test('rejects identical options (the book misprint case)', () => {
  assert.throws(
    () =>
      buildQuestionData({
        question: 'প্রশ্ন',
        options: ['a', 'b', 'c', 'b'],
        answer: 'ক',
      }),
    /খ ও ঘ হুবহু এক/
  );
});

test('rejects missing answer, wrong option count and empty question', () => {
  const opts = ['a', 'b', 'c', 'd'];
  assert.throws(() => buildQuestionData({ question: 'q', options: opts }), /সঠিক উত্তর/);
  assert.throws(() => buildQuestionData({ question: 'q', options: opts, answer: 'ঙ' }), /সঠিক উত্তর/);
  assert.throws(() => buildQuestionData({ question: 'q', options: ['a', 'b'], answer: 'ক' }), /৪টা অপশন/);
  assert.throws(() => buildQuestionData({ options: opts, answer: 'ক' }), /প্রশ্নের লেখা/);
});

test('keeps the passage (uddipok) image', () => {
  const q = buildQuestionData({
    question: 'q',
    passage: 'উদ্দীপক',
    passageImage: 'https://example.com/fig.png',
    options: ['a', 'b', 'c', 'd'],
    answer: 'ক',
  });
  assert.equal(q.passageImage, 'https://example.com/fig.png');
  assert.equal(buildQuestionData({ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 'ক' }).passageImage, '');
});

test('keeps the explanation text and its solution image', () => {
  const q = buildQuestionData({
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    answer: 'গ',
    explanation: 'সমাধান',
    explanationImage: 'https://example.com/solution.png',
  });
  assert.equal(q.explanation, 'সমাধান');
  assert.equal(q.explanationImage, 'https://example.com/solution.png');
  assert.equal(buildQuestionData({ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 'ক' }).explanationImage, '');
});

test('ইংরেজি প্রশ্নে A-D উত্তর আর optionStyle চলে', () => {
  const data = buildQuestionData({ question: 'Pick one', options: ['a1', 'b1', 'c1', 'd1'], answer: 'c', optionStyle: 'en' });
  assert.equal(data.correctIndex, 2);
  assert.equal(data.optionStyle, 'en');
  assert.equal(buildQuestionData({ question: 'x', options: ['1', '2', '3', '4'], correctIndex: 0 }).optionStyle, 'bn');
});
