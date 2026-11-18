import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// অ্যালগরিদম আগে থেকে বাঁধা থাকে, তাই টোকেনের ভেতরের alg বদলে ঢোকার সুযোগ নেই
const ALGORITHM = 'HS256';

export const signToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: ALGORITHM });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
