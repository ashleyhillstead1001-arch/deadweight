import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login attempts: max 5 attempts per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: false,
    skip: (req) => {
        // Skip rate limiting in development for testing
        return process.env.NODE_ENV === 'development';
    }
});

/**
 * Rate limiter for registration: max 3 attempts per hour per IP.
 */
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many registration attempts. Please try again later.',
    standardHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development';
    }
});

/**
 * Rate limiter for contact form: max 5 submissions per hour per IP.
 */
export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many submissions. Please try again later.',
    standardHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development';
    }
});
