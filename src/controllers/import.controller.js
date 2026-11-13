import { extractQuestionsFromImages } from '../services/gemini.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { arrangeExtracted } from '../utils/arrangeExtracted.js';
import { parseQuestionNumbers } from '../utils/parseQuestionNumbers.js';

// POST /api/import/from-images   (multipart/form-data)
//   images: ১-৫টা ছবি
//   mode: "all" (ছবির সব প্রশ্ন) অথবা "selected" (শুধু বাছাই করা নম্বর)
//   numbers: mode=selected হলে, যেমন "৩৪, ৩৫, ৪০-৪৫"
//   solveIfUnmarked: "true" হলে দাগ না থাকা প্রশ্নের উত্তর AI নিজে বের করবে
// সেভ হয় না। শুধু প্রশ্নের তালিকা ফেরত আসে, টিচার দেখে নিয়ে তারপর /api/questions/bulk এ সেভ করে।
export const extractFromImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) throw new ApiError(400, 'কমপক্ষে একটা ছবি দাও');

  const selected = req.body.mode === 'selected';
  const numbers = selected ? parseQuestionNumbers(req.body.numbers) : null;
  if (selected && numbers.length === 0) {
    throw new ApiError(400, 'কোন কোন নম্বরের প্রশ্ন লাগবে সেটা লেখো, যেমন: ৩৪, ৩৫, ৪০-৪৫');
  }

  const raw = await extractQuestionsFromImages({
    images: files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })),
    numbers,
    solveIfUnmarked: req.body.solveIfUnmarked === 'true',
  });

  const { questions, missing } = arrangeExtracted(raw, numbers);

  if (questions.length === 0) {
    throw new ApiError(
      422,
      selected
        ? 'এই নম্বরের কোনো প্রশ্ন ছবিতে পাওয়া যায়নি। নম্বর আর ছবি মিলিয়ে দেখো।'
        : 'ছবিতে কোনো প্রশ্ন পাওয়া যায়নি। ছবিটা আরও পরিষ্কার করে তুলে আবার দাও।'
    );
  }

  res.json({ questions, missing });
});
