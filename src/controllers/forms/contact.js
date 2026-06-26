import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createContactMessage, getAllContactMessages } from '../../models/forms/contact.js';
import { requireEmployee } from '../../middleware/auth.js';

const router = Router();

/**
 * GET /contact — display the contact form. If the visitor is signed in,
 * prefill their name and email.
 */
const showContactForm = (req, res) => {
    const user = req.session && req.session.user;
    res.render('forms/contact/form', {
        title: 'Contact',
        errors: [],
        values: user ? { name: user.name, email: user.email } : {}
    });
};

/**
 * POST /contact — validate and store a contact message.
 */
const handleContactSubmission = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('forms/contact/form', {
            title: 'Contact',
            errors: errors.array(),
            values: req.body
        });
    }

    try {
        const user = req.session && req.session.user;
        await createContactMessage({
            userId: user ? user.id : null,
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message
        });
        res.render('forms/contact/form', {
            title: 'Contact',
            errors: [],
            values: {},
            sent: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /contact/responses — list submitted messages (staff and owner only).
 */
const showContactResponses = async (req, res, next) => {
    try {
        const messages = await getAllContactMessages();
        res.render('forms/contact/responses', {
            title: 'Messages',
            messages
        });
    } catch (error) {
        next(error);
    }
};

router.get('/', showContactForm);
router.post('/',
    [
        body('name').trim().isLength({ min: 2 }).withMessage('Please enter your name.'),
        body('email').trim().isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
        body('subject').trim().isLength({ min: 2 }).withMessage('Subject must be at least 2 characters.'),
        body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters.')
    ],
    handleContactSubmission
);
router.get('/responses', requireEmployee, showContactResponses);

export default router;
