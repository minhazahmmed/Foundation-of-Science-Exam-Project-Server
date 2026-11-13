import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswers } from '../src/services/grading.service.js';
import { buildExamAnalysis } from '../src/services/analysis.service.js';

const questions = [
  { _id: 'q1', correctIndex: 0, text: 'one' },
  { _id: 'q2', correctIndex: 2, text: 'two' },
  { _id: 'q3', correctIndex: 1, text: 'three' },
  { _id: 'q4', correctIndex: 3, text: 'four' },
];

test('counts correct, wrong and skipped', () => {
  const answers = [
    { question: 'q1', selectedIndex: 0 }, // ঠিক
    { question: 'q2', selectedIndex: 1 }, // ভুল
    { question: 'q3', selectedIndex: null }, // উত্তর দেয়নি
    // q4 এর কোনো এন্ট্রিই নেই
  ];
  const r = gradeAnswers({ questions, answers });
  assert.equal(r.correctCount, 1);
  assert.equal(r.wrongCount, 1);
  assert.equal(r.skippedCount, 2);
  assert.equal(r.score, 1);
  assert.equal(r.total, 4);
  assert.deepEqual(r.details.map((d) => d.status), ['correct', 'wrong', 'skipped', 'skipped']);
});

test('negative marking lowers score but never below zero', () => {
  const allWrong = questions.map((q) => ({ question: q._id, selectedIndex: (q.correctIndex + 1) % 4 }));
  const r = gradeAnswers({ questions, answers: allWrong, negativeMark: 0.25 });
  assert.equal(r.score, 0);
  assert.equal(r.wrongCount, 4);

  const mixed = [
    { question: 'q1', selectedIndex: 0 },
    { question: 'q2', selectedIndex: 2 },
    { question: 'q3', selectedIndex: 0 },
  ];
  const m = gradeAnswers({ questions, answers: mixed, negativeMark: 0.25 });
  assert.equal(m.score, 1.75);
});

test('marksPerQuestion scales score and total', () => {
  const r = gradeAnswers({ questions, answers: [{ question: 'q1', selectedIndex: 0 }], marksPerQuestion: 2 });
  assert.equal(r.score, 2);
  assert.equal(r.total, 8);
});

test('fixing a wrong key changes the result (regrade case)', () => {
  const answers = [{ question: 'q1', selectedIndex: 1 }];
  const before = gradeAnswers({ questions, answers });
  const fixed = questions.map((q) => (q._id === 'q1' ? { ...q, correctIndex: 1 } : q));
  const after = gradeAnswers({ questions: fixed, answers });
  assert.equal(before.score, 0);
  assert.equal(after.score, 1);
});

test('analysis counts wrong answers and option picks per question', () => {
  const attempts = [
    { score: 1, answers: [{ question: 'q1', selectedIndex: 1 }, { question: 'q2', selectedIndex: 2 }] },
    { score: 0, answers: [{ question: 'q1', selectedIndex: 1 }, { question: 'q2', selectedIndex: 0 }] },
    { score: 1, answers: [{ question: 'q1', selectedIndex: 0 }] },
  ];
  const { summary, questions: stats } = buildExamAnalysis(questions, attempts);
  assert.equal(summary.attemptCount, 3);
  assert.equal(summary.highest, 1);
  assert.equal(stats[0].wrong, 2);
  assert.equal(stats[0].wrongPercent, 67);
  assert.deepEqual(stats[0].optionCounts, [1, 2, 0, 0]);
  assert.equal(stats[1].skipped, 1);
});

test('analysis with no attempts does not divide by zero', () => {
  const { summary, questions: stats } = buildExamAnalysis(questions, []);
  assert.equal(summary.average, 0);
  assert.equal(stats[0].wrongPercent, 0);
});
