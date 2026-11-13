const round2 = (n) => Math.round(n * 100) / 100;

// প্রশ্ন + স্টুডেন্টের উত্তর দিলে স্কোর আর প্রতিটা প্রশ্নের অবস্থা (correct/wrong/skipped) ফেরত দেয়।
// এটা শুধু হিসাব করে, ডেটাবেসে কিছু লেখে না, তাই সহজে টেস্ট করা যায়।
export function gradeAnswers({ questions, answers, marksPerQuestion = 1, negativeMark = 0 }) {
  const chosen = new Map(answers.map((a) => [String(a.question), a.selectedIndex]));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  // details এর ক্রম questions এর ক্রমের সাথে মেলে
  const details = questions.map((q) => {
    const value = chosen.get(String(q._id));
    const selectedIndex = Number.isInteger(value) ? value : null;

    let status = 'skipped';
    if (selectedIndex !== null) {
      status = selectedIndex === q.correctIndex ? 'correct' : 'wrong';
    }

    if (status === 'correct') correctCount++;
    else if (status === 'wrong') wrongCount++;
    else skippedCount++;

    return { selectedIndex, correctIndex: q.correctIndex, status };
  });

  const total = round2(questions.length * marksPerQuestion);
  const raw = correctCount * marksPerQuestion - wrongCount * negativeMark;
  const score = Math.max(0, round2(raw)); // নেগেটিভ মার্কিংয়েও স্কোর ০ এর নিচে নামে না

  return { score, total, correctCount, wrongCount, skippedCount, details };
}
