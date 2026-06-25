/**
 * Authentication & authorization middleware.
 *
 * The `users.role` column is a Postgres ENUM with three values:
 *   - 'owner'    → full administrator (the business owner)
 *   - 'staff'    → employee with elevated, but not full, access
 *   - 'customer' → standard signed-in user
 *
 * These map to the conversational names admin / employee / standard.
 */

// Canonical role names as stored in the database.
const ROLES = Object.freeze({
    ADMIN: 'owner',
    EMPLOYEE: 'staff',
    STANDARD: 'customer'
});

/**
 * Read the authenticated user off the session, or null if there isn't one.
 */
const getSessionUser = (req) => (req.session && req.session.user) || null;

/**
 * Populate res.locals so views can react to auth state without re-reading
 * the session. Safe to call on every request.
 */
const setAuthLocals = (res, user) => {
    res.locals.isLoggedIn = Boolean(user);
    res.locals.currentUser = user || null;
    res.locals.userRole = user ? user.role : null;
    res.locals.isAdmin = Boolean(user) && user.role === ROLES.ADMIN;
    res.locals.isEmployee = Boolean(user) && user.role === ROLES.EMPLOYEE;
    res.locals.isStandard = Boolean(user) && user.role === ROLES.STANDARD;
};

/**
 * Require an authenticated user (any role).
 * Redirects to the login page when no session user is present.
 */
const requireLogin = (req, res, next) => {
    const user = getSessionUser(req);

    if (!user) {
        return res.redirect('/login');
    }

    setAuthLocals(res, user);
    next();
};

/**
 * Factory that builds middleware requiring one of the allowed roles.
 * Always enforces authentication first, so it can be used on its own.
 *
 * @param {...string} allowedRoles - DB role values permitted through.
 * @returns {Function} Express middleware.
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
    const user = getSessionUser(req);

    // Not logged in at all → send to login (preserves the existing UX).
    if (!user) {
        return res.redirect('/login');
    }

    setAuthLocals(res, user);

    // Logged in but lacking the required role → 403 Forbidden.
    if (!allowedRoles.includes(user.role)) {
        const err = new Error('You do not have permission to access this page.');
        err.status = 403;
        return next(err);
    }

    next();
};

/**
 * Convenience middleware for the three access tiers.
 *
 * - requireAdmin:    owner only.
 * - requireEmployee: staff or owner (owner inherits employee access).
 * - requireStandard: any authenticated user (alias of requireLogin).
 */
const requireAdmin = requireRole(ROLES.ADMIN);
const requireEmployee = requireRole(ROLES.EMPLOYEE, ROLES.ADMIN);
const requireStandard = requireLogin;

export {
    ROLES,
    requireLogin,
    requireRole,
    requireAdmin,
    requireEmployee,
    requireStandard
};
