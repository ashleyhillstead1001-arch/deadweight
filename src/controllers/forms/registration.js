import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { emailExists, saveUser, getAllUsers } from '../../models/forms/registration.js';
import { requireEmployee } from '../../middleware/auth.js';
import { registrationLimiter } from '../../middleware/rate-limit.js';

const router = Router();

/**
 * Validation rules for user registration
 */
const registrationValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Name must be between 2 and 255 characters')
        .escape(),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email must be at most 255 characters')
        .escape(),
    body('emailConfirm')
        .trim()
        .isEmail()
        .normalizeEmail()
        .custom((value, { req }) => value === req.body.email)
        .withMessage('Email addresses must match'),
    body('password')
        .isLength({ min: 8, max: 255 })
        .withMessage('Password must be between 8 and 255 characters')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/)
        .withMessage('Password must contain at least one special character'),
    body('passwordConfirm')
        .isLength({ min: 8, max: 255 })
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords must match')
];

/**
 * Display the registration form page.
 */
const showRegistrationForm = (req, res) => {
    res.render('forms/registration/form', {
        title: 'User Registration'
    });
};

/**
 * Handle user registration with validation and password hashing.
 */
const processRegistration = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Don't log details — render with errors instead
        return res.redirect('/register');
    }

    const { name, email, password } = req.body;

    try {
        const alreadyExists = await emailExists(email);
        if (alreadyExists) {
            // Generic message — don't reveal if email exists
            return res.redirect('/register');
        }

        // Securely hash password using 10 rounds of salt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Persist records to PostgreSQL via the Model layer
        await saveUser(name, email, hashedPassword);
        console.log(`User registered successfully: ${email}`);

        return res.redirect('/register/list');
    } catch (error) {
        console.error('Error during processing registration:', error);
        return res.redirect('/register');
    }
};

/**
 * Display all registered users.
 */
const showAllUsers = async (req, res) => {
    let users = [];
    try {
        users = await getAllUsers();
    } catch (error) {
        console.error('Error fetching registered users:', error);
    }

    res.render('forms/registration/list', {
        title: 'Registered Users',
        users
    });
};

/**
 * Route Mapping
 */
router.get('/', showRegistrationForm);
router.post('/', registrationLimiter, registrationValidation, processRegistration);
// Listing every registered user is sensitive — restrict to staff and owner.
router.get('/list', requireEmployee, showAllUsers);

export default router;
