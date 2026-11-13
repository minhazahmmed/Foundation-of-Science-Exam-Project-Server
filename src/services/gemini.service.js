import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

let client;

// প্রথমবার দরকার হলে বানানো হয়। key না থাকলেও বাকি সার্ভার ঠিকমতো চালু থাকে।
function getClient() {
  if (!env.geminiApiKey) {
    throw new ApiError(503, 'সার্ভারের .env ফাইলে GEMINI_API_KEY বসানো নেই');
  }
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

// এই আকারেই JSON দিতে মডেলকে বাধ্য করা হয়, তাই ```json ... ``` ছেঁটে ফেলার ঝামেলা নেই
const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      bookNo: { type: Type.INTEGER, nullable: true },
      board: { type: Type.STRING },
      passage: { type: Type.STRING },
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.STRING, nullable: true },
      answerGuessed: { type: Type.BOOLEAN },
      needsImage: { type: Type.STRING },
    },
    required: ['bookNo', 'question', 'options', 'answer'],
  },
};

export function buildPrompt({ numbers, solveIfUnmarked }) {
  const scope = numbers?.length
    ? `শুধু বইয়ের এই নম্বরের প্রশ্নগুলো বের করো: ${numbers.join(', ')}। এই তালিকার বাইরের কোনো প্রশ্ন দেবে না। কোনো নম্বর ছবিতে না পেলে সেটা বাদ দাও, নিজে বানিয়ে লিখবে না।`
    : 'ছবিতে যতগুলো MCQ প্রশ্ন আছে সবগুলো বের করো, ছবিতে যে ক্রমে আছে সেই ক্রমে।';

  const unmarked = solveIfUnmarked
    ? 'কোনো প্রশ্নে দাগ না থাকলে নিজে হিসাব করে সঠিক উত্তর বের করো এবং ওই প্রশ্নে "answerGuessed" এ true দাও। দাগ দেখে পাওয়া উত্তরে false দাও।'
    : 'কোনো প্রশ্নে দাগ না থাকলে বা দাগ পরিষ্কার না হলে "answer" এ null দাও। নিজে সমাধান করে উত্তর বসাবে না।';

  return `তুমি বাংলাদেশের এইচএসসি পাঠ্যবইয়ের MCQ পাতা থেকে প্রশ্ন টুকে লেখার সহকারী।
ছবির প্রশ্ন নতুন করে বানানো বা বদলানো তোমার কাজ নয়। ছাপা প্রশ্নগুলো হুবহু তুলে লেখাই কাজ।

নিয়ম:
1. ${scope}
2. "bookNo" এ বইয়ে প্রশ্নের পাশে ছাপা নম্বরটা ইংরেজি অঙ্কে দাও (যেমন ৭৪ হলে 74)।
3. প্রশ্ন ও অপশনের লেখা হুবহু তোলো। অপশনের ক/খ/গ/ঘ অক্ষর বাদ দিয়ে শুধু অপশনের লেখা দাও, ক্রম ঠিক রাখো। অপশন সবসময় ঠিক ৪টা।
4. সমীকরণ, ভেক্টর চিহ্ন, ভগ্নাংশ, মূল, গ্রিক অক্ষর সব LaTeX আকারে $...$ এর ভেতরে লেখো। যেমন $\\vec{A}\\times\\vec{B}$, $\\frac{x^2}{2}$, $\\theta=\\pi$। বাংলা লেখা $ এর বাইরে থাকবে।
5. (i), (ii), (iii) ধরনের বিবৃতিওয়ালা প্রশ্নে বিবৃতিগুলো "question" এর ভেতরেই লেখো, শেষের "নিচের কোনটি সঠিক?" অংশসহ।
6. উদ্দীপক বা অনুচ্ছেদ থাকলে (যেমন "তথ্যটি থেকে ৭৬ ও ৭৭ নং প্রশ্নের উত্তর দাও") সেটা যে প্রশ্নগুলোর জন্য প্রযোজ্য তাদের প্রতিটার "passage" এ আলাদা করে লেখো। না থাকলে ফাঁকা স্ট্রিং।
7. বোর্ডের নাম বা সাল ([ঢা. বো. ২০১৫] ইত্যাদি) থাকলে "board" এ দাও, না থাকলে ফাঁকা স্ট্রিং।
8. প্রশ্ন বুঝতে কোনো চিত্র বা গ্রাফ লাগলে (যা লেখা দিয়ে প্রকাশ করা যায় না) "needsImage" এ এক লাইনে লেখো কী চিত্র। না লাগলে ফাঁকা স্ট্রিং।
9. সঠিক উত্তর: প্রশ্নের অপশনে যেটা টিক, গোল দাগ বা কলমের দাগে চিহ্নিত সেটাই "answer" (ক, খ, গ বা ঘ)। পাতার পাশে হাতে লেখা নোট, লাল গোল দাগ বা প্রশ্ন নম্বরের চারপাশের দাগ উত্তরের চিহ্ন নয়, ওগুলো উপেক্ষা করো।
10. ${unmarked}
11. কোনো লেখা পড়া না গেলে অনুমান করে বসাবে না, ওই জায়গায় [অস্পষ্ট] লিখে দাও।

শুধু JSON array ফেরত দাও।`;
}

// images: [{ buffer, mimeType }]। কাঁচা প্রশ্নের তালিকা ফেরত দেয় (ক্রম সাজানো পরে হয়)।
// testClient শুধু টেস্টে নকল client বসানোর জন্য।
export async function extractQuestionsFromImages({ images, numbers = null, solveIfUnmarked = false }, testClient) {
  const ai = testClient ?? getClient();

  const imageParts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.buffer.toString('base64') },
  }));

  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: 'user', parts: [...imageParts, { text: buildPrompt({ numbers, solveIfUnmarked }) }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0, // টুকে লেখার কাজে সৃজনশীলতা লাগে না
      },
    });

    const list = JSON.parse(response.text);
    if (!Array.isArray(list)) throw new SyntaxError('not an array');
    return list;
  } catch (err) {
    throw toApiError(err);
  }
}

function toApiError(err) {
  const status = err.status ?? err.code;

  if (err instanceof SyntaxError) {
    return new ApiError(502, 'AI-এর উত্তরটা পড়া যায়নি, আবার চেষ্টা করো');
  }
  if (status === 429) {
    return new ApiError(429, 'Gemini-র ফ্রি সীমা আপাতত শেষ। কিছুক্ষণ পরে আবার চেষ্টা করো।');
  }
  if (status === 401 || status === 403 || /API key/i.test(err.message || '')) {
    return new ApiError(502, 'GEMINI_API_KEY ঠিক নয় বা অনুমতি নেই। .env ফাইলের key টা আবার দেখো।');
  }
  if (status === 404) {
    return new ApiError(502, `Gemini মডেল "${env.geminiModel}" পাওয়া যায়নি। .env এর GEMINI_MODEL বদলে দেখো।`);
  }

  console.error('Gemini error:', err);
  return new ApiError(502, 'ছবি থেকে প্রশ্ন বের করা যায়নি, একটু পরে আবার চেষ্টা করো');
}
