import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter, authLimiter, importLimiter } from './middleware/rateLimit.js';
import attemptRoutes from './routes/attempt.routes.js';
import authRoutes from './routes/auth.routes.js';
import examRoutes from './routes/exam.routes.js';
import importRoutes from './routes/import.routes.js';
import questionRoutes from './routes/question.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import practiceRoutes from './routes/practice.routes.js';

const app = express();

// Vercel এর প্রক্সির পেছনে আসল আইপি পেতে (rate limit এর জন্য দরকার)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.clientUrls }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiLimiter);

// প্রতিটা অনুরোধের আগে ডাটাবেস কানেক্ট আছে কিনা দেখে (কানেকশন জমা থাকে, তাই দ্রুত)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB-তে কানেক্ট হওয়া যায়নি:', err.message);
    res.status(503).json({ message: 'ডাটাবেসে কানেক্ট হওয়া যাচ্ছে না, একটু পর আবার চেষ্টা করো' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/import', importLimiter, importRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/teachers', teacherRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
