import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import attemptRoutes from './routes/attempt.routes.js';
import authRoutes from './routes/auth.routes.js';
import examRoutes from './routes/exam.routes.js';
import importRoutes from './routes/import.routes.js';
import questionRoutes from './routes/question.routes.js';
import teacherRoutes from './routes/teacher.routes.js';

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/teachers', teacherRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
