import db from '../db.js';

/**
 * Data access for the storage_requests resource and its related tables
 * (status_history, item_images, reviews). All queries are parameterized.
 *
 * The request_status enum, in workflow order:
 *   requested -> approved -> awaiting_pickup -> in_storage -> out_for_return -> returned
 */

export const REQUEST_STATUSES = [
    'requested',
    'approved',
    'awaiting_pickup',
    'in_storage',
    'out_for_return',
    'returned'
];

/**
 * All storage requests (staff/owner view), newest first, with the owner's name.
 */
const getAllRequests = async () => {
    const query = `
        SELECT r.id, r.item_name, r.item_description, r.requested_volume,
               r.pickup_date, r.return_date, r.current_status, r.created_at,
               u.name AS owner_name
        FROM storage_requests r
        JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

/**
 * Storage requests belonging to a single user, newest first.
 */
const getRequestsByUser = async (userId) => {
    const query = `
        SELECT id, item_name, item_description, requested_volume,
               pickup_date, return_date, current_status, created_at
        FROM storage_requests
        WHERE user_id = $1
        ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
};

/**
 * A single request by id, including the owner's name and email.
 */
const getRequestById = async (id) => {
    const query = `
        SELECT r.*, u.name AS owner_name, u.email AS owner_email
        FROM storage_requests r
        JOIN users u ON u.id = r.user_id
        WHERE r.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
};

/**
 * The full status timeline for a request, oldest first, with who changed it.
 */
const getStatusHistory = async (requestId) => {
    const query = `
        SELECT h.status, h.note, h.changed_at, u.name AS changed_by_name
        FROM status_history h
        LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.storage_request_id = $1
        ORDER BY h.changed_at ASC
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
};

/**
 * Images attached to a request, oldest first.
 */
const getImagesForRequest = async (requestId) => {
    const query = `
        SELECT file_name, file_url, mime_type, caption, uploaded_at
        FROM item_images
        WHERE storage_request_id = $1
        ORDER BY uploaded_at ASC
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
};

/**
 * Reviews tied to a request, with the reviewer's name, newest first.
 */
const getReviewsForRequest = async (requestId) => {
    const query = `
        SELECT rv.rating, rv.comment, rv.created_at, u.name AS reviewer_name
        FROM reviews rv
        JOIN users u ON u.id = rv.user_id
        WHERE rv.storage_request_id = $1
        ORDER BY rv.created_at DESC
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
};

/**
 * Create a new storage request, then log the opening 'requested' status in
 * the same transaction so the timeline always starts correctly.
 */
const createRequest = async ({ userId, itemName, itemDescription, requestedVolume, pickupDate, returnDate, notes }) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const insertRequest = `
            INSERT INTO storage_requests
                (user_id, item_name, item_description, requested_volume, pickup_date, return_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const reqResult = await client.query(insertRequest, [
            userId,
            itemName,
            itemDescription || null,
            requestedVolume,
            pickupDate || null,
            returnDate || null,
            notes || null
        ]);
        const request = reqResult.rows[0];

        const insertHistory = `
            INSERT INTO status_history (storage_request_id, status, changed_by, note)
            VALUES ($1, 'requested', $2, 'Request created by customer')
        `;
        await client.query(insertHistory, [request.id, userId]);

        await client.query('COMMIT');
        return request;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Advance a request to a new status and log it to the timeline, in one
 * transaction. Validates the status against the enum first.
 */
const updateRequestStatus = async ({ requestId, status, changedBy, note }) => {
    if (!REQUEST_STATUSES.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const update = `
            UPDATE storage_requests
            SET current_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await client.query(update, [status, requestId]);
        const updated = result.rows[0];

        const insertHistory = `
            INSERT INTO status_history (storage_request_id, status, changed_by, note)
            VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertHistory, [requestId, status, changedBy || null, note || null]);

        await client.query('COMMIT');
        return updated;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export {
    getAllRequests,
    getRequestsByUser,
    getRequestById,
    getStatusHistory,
    getImagesForRequest,
    getReviewsForRequest,
    createRequest,
    updateRequestStatus
};
