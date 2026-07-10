import { Router } from 'express';

// Static page controllers
import { homePage, aboutPage, howItWorksPage } from './index.js';

// Storage requests (the core resource)
import requestRoutes from './requests/requests.js';

// Form/auth routes
import contactRoutes from './forms/contact.js';
import registrationRoutes from './forms/registration.js';
import loginRoutes, { processLogout, showDashboard } from './forms/login.js';

// Auth middleware
import { requireLogin } from '../middleware/auth.js';
import adminRoutes from './admin.js';

const router = Router();

/**
 * A single design-system stylesheet (main.css) is loaded in the header for
 * every page, so the old per-route CSS injection is no longer needed.
 */

// Static pages
router.get('/', homePage);
router.get('/about', aboutPage);
router.get('/how-it-works', howItWorksPage);

// Core resource: storage requests
router.use('/requests', requestRoutes);

// Forms
router.use('/contact', contactRoutes);
router.use('/register', registrationRoutes);
router.use('/login', loginRoutes);

// Auth-related root routes
router.get('/logout', processLogout);
router.get('/dashboard', requireLogin, showDashboard);
router.use('/admin', adminRoutes);

export default router;
