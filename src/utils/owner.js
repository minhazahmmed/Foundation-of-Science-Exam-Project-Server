import { env } from '../config/env.js';

// মূল শিক্ষকের ইমেইল কিনা
export const isOwnerEmail = (email) => String(email || '').trim().toLowerCase() === env.ownerEmail;
