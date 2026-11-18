// টিচারের প্যানেলের জন্য: কোন প্রশ্নে কতজন ভুল করেছে, কোন অপশনে কতজন টিক দিয়েছে।
// questions: পপুলেট করা প্রশ্ন, attempts: জমা দেওয়া attempt
export function buildExamAnalysis(questions, attempts) {
  const stats = questions.map((q) => ({
    questionId: q._id,
    text: q.text,
    correctIndex: q.correctIndex,
    optionStyle: q.optionStyle || 'bn',
    optionCounts: [0, 0, 0, 0],
    correct: 0,
    wrong: 0,
    skipped: 0,
    wrongPercent: 0,
  }));

  for (const attempt of attempts) {
    const chosen = new Map(attempt.answers.map((a) => [String(a.question), a.selectedIndex]));

    stats.forEach((stat) => {
      const value = chosen.get(String(stat.questionId));
      if (!Number.isInteger(value)) {
        stat.skipped++;
        return;
      }
      stat.optionCounts[value]++;
      if (value === stat.correctIndex) stat.correct++;
      else stat.wrong++;
    });
  }

  const count = attempts.length;
  stats.forEach((stat) => {
    stat.wrongPercent = count ? Math.round((stat.wrong / count) * 100) : 0;
  });

  const scores = attempts.map((a) => a.score);
  const summary = {
    attemptCount: count,
    average: count ? Math.round((scores.reduce((s, n) => s + n, 0) / count) * 100) / 100 : 0,
    highest: count ? Math.max(...scores) : 0,
    lowest: count ? Math.min(...scores) : 0,
  };

  return { summary, questions: stats };
}
