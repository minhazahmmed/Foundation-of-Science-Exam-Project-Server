import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
