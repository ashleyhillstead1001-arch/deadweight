import db from '../db.js';

/**
 * Data access for contact_messages.
 *
 * The schema allows messages from both signed-in users and anonymous
 * visitors: user_id is nullable and SET NULL on user deletion, so the
 * message history survives. status uses a CHECK of received/replied/closed.
 */

/**
 * Insert a new contact message.
 *
 * @param {Object} data
 * @param {number|null} data.userId  - id of the signed-in user, or null
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.subject
 * @param {string} data.message
 * @returns {Promise<Object>} the created row
 */
const createContactMessage = async ({ userId, name, email, subject, message }) => {
    const query = `
        INSERT INTO contact_messages (user_id, name, email, subject, message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const result = await db.query(query, [userId || null, name, email, subject, message]);
    return result.rows[0];
};

/**
 * All contact messages, newest first (staff/owner view).
 */
const getAllContactMessages = async () => {
    const query = `
        SELECT id, name, email, subject, message, status, received_at
        FROM contact_messages
        ORDER BY received_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

export { createContactMessage, getAllContactMessages };
