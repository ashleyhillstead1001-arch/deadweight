import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createContactMessage, getAllContactMessages } from '../../models/forms/contact.js';
import { requireEmployee } from '../../middleware/auth.js';
import { contactLimiter } from '../../middleware/rate-limit.js';

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
    contactLimiter,
    [
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
            .escape(),
        body('subject')
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Subject must be between 2 and 255 characters')
            .escape(),
        body('message')
            .trim()
            .isLength({ min: 10, max: 10000 })
            .withMessage('Message must be between 10 and 10,000 characters')
            .escape()
    ],
    handleContactSubmission
);
router.get('/responses', requireEmployee, showContactResponses);

export default router;
