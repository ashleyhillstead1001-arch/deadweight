import db from '../db.js';
import bcrypt from 'bcrypt';

/**
 * Data access for login / authentication.
 *
 * Looks users up by email and verifies a submitted password against the
 * stored bcrypt hash. Returns the role so the session user carries it, which
 * the auth middleware (owner / staff / customer) depends on.
 */

/**
 * Find a single user by email address.
 *
 * @param {string} email
 * @returns {Promise<Object|null>} the user row (including password hash and
 *   role), or null if no account matches.
 */
const findUserByEmail = async (email) => {
    const query = `
        SELECT id, name, email, password, role, created_at
        FROM users
        WHERE email = $1
    `;
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
};

/**
 * Compare a plain-text password against a stored bcrypt hash.
 *
 * @param {string} plainPassword - the password submitted on the login form
 * @param {string} hashedPassword - the bcrypt hash stored in the database
 * @returns {Promise<boolean>} true if the password matches
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
    return bcrypt.compare(plainPassword, hashedPassword);
};

export { findUserByEmail, verifyPassword };
