# FOS Exam Platform: Server

## চালু করার নিয়ম
```bash
npm install
cp .env.example .env     # তারপর .env এ নিজের MONGO_URI, JWT_SECRET, OWNER_EMAIL বসাও
npm run dev              # http://localhost:5000
npm test                 # গ্রেডিং ও ইনপুটের টেস্ট
```

## টিচার অ্যাকাউন্ট
`POST /api/auth/register` এ সবাই student হয়। `wantsTeacher: true` পাঠালে শিক্ষক হওয়ার অনুরোধ জমা হয়, মূল শিক্ষক (`.env` এর `OWNER_EMAIL`) অনুমোদন দিলে তবে teacher হয়। `OWNER_EMAIL` এর ইমেইলে খুললে সরাসরি teacher।

## API
| Method | Path | কে | কাজ |
|---|---|---|---|
| POST | /api/auth/register, /login | সবাই | অ্যাকাউন্ট খোলা, লগইন (token পাওয়া যায়) |
| POST | /api/auth/request-teacher | student | শিক্ষক হওয়ার অনুরোধ পাঠানো |
| GET | /api/teachers | মূল শিক্ষক | অপেক্ষায় থাকা অনুরোধ ও শিক্ষকদের তালিকা |
| POST | /api/teachers/:id/approve, /reject, /remove | মূল শিক্ষক | অনুমোদন, বাতিল, শিক্ষক থেকে সরানো |
| GET | /api/auth/me | লগইন করা | নিজের তথ্য |
| GET/POST | /api/questions | teacher | প্রশ্ন ব্যাংক তালিকা, নতুন প্রশ্ন |
| POST | /api/questions/bulk | teacher | JSON থেকে একসাথে অনেক প্রশ্ন |
| GET | /api/questions/chapters | teacher | চ্যাপ্টারের তালিকা |
| GET/PUT/DELETE | /api/questions/:id | teacher | একটা প্রশ্ন দেখা, ঠিক করা, মোছা |
| POST/GET | /api/exams | teacher | পরীক্ষা বানানো (নিজে বেছে বা র‍্যান্ডম), তালিকা |
| GET/PATCH/DELETE | /api/exams/:id | teacher | পরীক্ষা দেখা, বদলানো, মোছা |
| GET | /api/exams/:id/attempts | teacher | কে কত পেল |
| GET | /api/exams/:id/analysis | teacher | কোন প্রশ্নে কতজন ভুল করেছে |
| POST | /api/exams/:id/regrade | teacher | প্রশ্নের উত্তর ঠিক করার পর সবার স্কোর নতুন করে হিসাব |
| POST | /api/import/from-images | teacher | বইয়ের পাতার ছবি (১-৫টা) থেকে প্রশ্ন বের করা। `mode=all` বা `mode=selected` + `numbers="৩৪, ৩৫, ৪০-৪৫"`। সেভ হয় না, শুধু তালিকা ফেরত আসে |
| GET | /api/exams/public/:code | সবাই | লিংক খুললে পরীক্ষার নাম, সময় |
| POST | /api/attempts/start/:code | student | পরীক্ষা শুরু (আবার ঢুকলে আগেরটাই চলে) |
| PATCH | /api/attempts/:id/answer | student | একটা উত্তর সেভ |
| POST | /api/attempts/:id/submit | student | জমা দেওয়া |
| GET | /api/attempts/mine | student | নিজের দেওয়া পরীক্ষাগুলো |
| GET | /api/attempts/:id/result | student/teacher | নম্বর, ভুল-ঠিক, সঠিক উত্তরসহ ফলাফল |

## ছবি থেকে আসা JSON
`POST /api/questions/bulk` এ এই আকারে পাঠানো যায় (সঠিক উত্তর ক/খ/গ/ঘ অক্ষরে):
```json
{
  "chapter": "ভেক্টর",
  "subject": "উচ্চতর গণিত",
  "questions": [
    { "no": 79, "question": "...", "options": ["...", "...", "...", "..."], "answer": "খ" }
  ]
}
```
একটাও প্রশ্নে সমস্যা থাকলে (যেমন দুটো অপশন হুবহু এক) কোনোটাই সেভ হয় না, আর কোন নম্বরে কী সমস্যা তার তালিকা ফেরত আসে।
