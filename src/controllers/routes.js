import { Router } from 'express';
// Create a new router instance
const router = Router();

/**
* Add import statements for controllers and middleware
*/
// The demo headers middleware from ../middleware/demo/headers.js
import { addDemoHeaders } from '../middleware/demo/headers.js';
// The course controllers from ./course/course.js
import { courseListPage, courseDetailPage } from './course/course.js';
// The basic page controllers from ./index.js
import { homePage, aboutPage, demoPage, testErrorPage } from './index.js';
// The faculty controllers from ./faculty/faculty.js
import { facultyListPage, facultyDetailPage } from './faculty/faculty.js';
// The contact form routes from ./forms/contact.js
import contactRoutes from './forms/contact.js';
// The registration form routes from ./forms/registration.js
import registrationRoutes from './forms/registration.js';
// The login/logout/dashboard routes from ./forms/login.js
import loginRoutes from './forms/login.js';
// The authentication middleware from ../middleware/auth.js
import { processLogout, showDashboard } from './forms/login.js';
// The global middleware to add local variables from ../middleware/global.js
import { requireLogin } from '../middleware/auth.js';

/**
 * 🚀 Router-Level Middleware
 * These intercept requests to specific paths and inject the correct CSS asset tags
 * BEFORE the route handlers compile the views.
 */

// Automatically inject catalog styles to all course-related views
router.use('/course', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/catalog.css">');
    next();
});

// Automatically inject faculty styles to all faculty-related views
router.use('/faculty', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/faculty.css">');
    next();
});

// Add contact-specific styles to all contact routes
router.use('/contact', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/contact.css">');
    next();
});

// Add the contact form routes under /contact
router.use('/contact', contactRoutes);

// Add registration-specific styles to all registration routes
router.use('/register', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/registration.css">');
    next();
});

// Add the registration form routes under /register
router.use('/register', registrationRoutes);

// Add login-specific styles to all login routes
router.use('/login', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/login.css">');
    next();
});

// Login routes (form and submission)
router.use('/login', loginRoutes);

/**
 * Add route definitions
 */
// Authentication-related routes at root level
router.get('/logout', processLogout);
router.get('/dashboard', requireLogin, showDashboard);

// Home and basic pages
router.get('/', homePage);
router.get('/about', aboutPage);

// Course routes
router.get('/course', courseListPage);
router.get('/course/:courseSlug', courseDetailPage);

// Demo page with special middleware
router.get('/demo', addDemoHeaders, demoPage);
// Route to trigger a test error
router.get('/test-error', testErrorPage);

// Faculty routes
router.get('/faculty', facultyListPage);
router.get('/faculty/:facultySlug', facultyDetailPage);

export default router;
