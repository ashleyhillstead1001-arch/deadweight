import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { emailExists, saveUser, getAllUsers } from '../../models/forms/registration.js';

const router = Router();

/**
 * Validation rules for user registration
 */
const registrationValidation = [
    body('name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    body('emailConfirm')
        .trim()
        .custom((value, { req }) => value === req.body.email)
        .withMessage('Email addresses must match'),
    body('password')
        .isLength({ min: 8 })
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/)
        .withMessage('Password must contain at least one special character'),
    body('passwordConfirm')
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
        console.error('Validation errors:', errors.array());
        return res.redirect('/register');
    }

    const { name, email, password } = req.body;

    try {
        const alreadyExists = await emailExists(email);
        if (alreadyExists) {
            console.warn(`Registration failed: Email ${email} already registered.`);
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
router.post('/', registrationValidation, processRegistration);
router.get('/list', showAllUsers);

export default router;
