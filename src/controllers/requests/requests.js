import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
    getAllRequests,
    getRequestsByUser,
    getRequestById,
    getStatusHistory,
    getImagesForRequest,
    getReviewsForRequest,
    createRequest,
    updateRequest,
    updateRequestStatus,
    deleteRequest,
    REQUEST_STATUSES
} from '../../models/requests/requests.js';
import { requireLogin, requireEmployee } from '../../middleware/auth.js';

/**
 * Load a request by id and enforce access: staff/owner may act on any request,
 * a customer only on their own. Returns the request, or calls next(err) and
 * returns null when not found (404) or not permitted (403).
 */
const loadAuthorizedRequest = async (req, next) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        const err = new Error('Request not found');
        err.status = 404;
        next(err);
        return null;
    }

    const request = await getRequestById(id);
    if (!request) {
        const err = new Error('Request not found');
        err.status = 404;
        next(err);
        return null;
    }

    const user = req.session.user;
    const isStaff = user.role === 'staff' || user.role === 'owner';
    if (!isStaff && request.user_id !== user.id) {
        const err = new Error('You do not have permission to access this request.');
        err.status = 403;
        next(err);
        return null;
    }

    return request;
};

const router = Router();

/**
 * GET /requests — the signed-in user's own storage requests.
 */
const showMyRequests = async (req, res, next) => {
    try {
        const requests = await getRequestsByUser(req.session.user.id);
        res.render('requests/list', {
            title: 'My requests',
            heading: 'My storage requests',
            intro: 'Track each of your requests from pickup through return.',
            requests,
            showOwner: false
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /requests/all — every request (staff and owner only).
 */
const showAllRequests = async (req, res, next) => {
    try {
        const requests = await getAllRequests();
        res.render('requests/list', {
            title: 'All requests',
            heading: 'All storage requests',
            intro: 'Every customer request across the service.',
            requests,
            showOwner: true
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /requests/new — the new-request form.
 */
const showNewRequestForm = (req, res) => {
    res.render('requests/new', {
        title: 'Request storage',
        errors: [],
        values: {}
    });
};

/**
 * POST /requests — validate and create a request for the signed-in user.
 */
const handleCreateRequest = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('requests/new', {
            title: 'Request storage',
            errors: errors.array(),
            values: req.body
        });
    }

    try {
        const request = await createRequest({
            userId: req.session.user.id,
            itemName: req.body.item_name,
            itemDescription: req.body.item_description,
            requestedVolume: req.body.requested_volume,
            pickupDate: req.body.pickup_date,
            returnDate: req.body.return_date,
            notes: req.body.notes
        });
        res.redirect(`/requests/${request.id}`);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /requests/:id — full detail: request, status timeline, images, reviews.
 * Customers may only view their own requests; staff and owners may view any.
 */
const showRequestDetail = async (req, res, next) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            const err = new Error('Request not found');
            err.status = 404;
            return next(err);
        }

        const request = await getRequestById(id);
        if (!request) {
            const err = new Error('Request not found');
            err.status = 404;
            return next(err);
        }

        // Authorization: a customer can only see their own request.
        const user = req.session.user;
        const isStaff = user.role === 'staff' || user.role === 'owner';
        if (!isStaff && request.user_id !== user.id) {
            const err = new Error('You do not have permission to view this request.');
            err.status = 403;
            return next(err);
        }

        const [history, images, reviews] = await Promise.all([
            getStatusHistory(id),
            getImagesForRequest(id),
            getReviewsForRequest(id)
        ]);

        // Index of the current status in the ordered workflow, for the stepper.
        const currentIndex = REQUEST_STATUSES.indexOf(request.current_status);

        res.render('requests/detail', {
            title: request.item_name,
            request,
            history,
            images,
            reviews,
            statuses: REQUEST_STATUSES,
            currentIndex
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /requests/:id/edit — show the edit form for an editable request.
 */
const showEditRequestForm = async (req, res, next) => {
    try {
        const request = await loadAuthorizedRequest(req, next);
        if (!request) return;

        res.render('requests/edit', {
            title: `Edit ${request.item_name}`,
            request,
            errors: [],
            values: {
                item_name: request.item_name,
                item_description: request.item_description || '',
                requested_volume: request.requested_volume,
                pickup_date: request.pickup_date ? new Date(request.pickup_date).toISOString().slice(0, 10) : '',
                return_date: request.return_date ? new Date(request.return_date).toISOString().slice(0, 10) : '',
                notes: request.notes || ''
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /requests/:id/edit — validate and save edits to a request's fields.
 */
const handleEditRequest = async (req, res, next) => {
    try {
        const request = await loadAuthorizedRequest(req, next);
        if (!request) return;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('requests/edit', {
                title: `Edit ${request.item_name}`,
                request,
                errors: errors.array(),
                values: req.body
            });
        }

        await updateRequest({
            requestId: request.id,
            itemName: req.body.item_name,
            itemDescription: req.body.item_description,
            requestedVolume: req.body.requested_volume,
            pickupDate: req.body.pickup_date,
            returnDate: req.body.return_date,
            notes: req.body.notes
        });
        res.redirect(`/requests/${request.id}`);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /requests/:id/status — staff/owner advance a request's status, logged
 * to the timeline. requireEmployee on the route already gates access.
 */
const handleStatusChange = async (req, res, next) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            const err = new Error('Request not found');
            err.status = 404;
            return next(err);
        }

        const request = await getRequestById(id);
        if (!request) {
            const err = new Error('Request not found');
            err.status = 404;
            return next(err);
        }

        const { status, note } = req.body;
        if (!REQUEST_STATUSES.includes(status)) {
            const err = new Error('Invalid status value.');
            err.status = 400;
            return next(err);
        }

        await updateRequestStatus({
            requestId: id,
            status,
            changedBy: req.session.user.id,
            note: note || null
        });
        res.redirect(`/requests/${id}`);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /requests/:id/delete — delete a request (customer's own, or any for
 * staff/owner). Cascades to history and images via the schema.
 */
const handleDeleteRequest = async (req, res, next) => {
    try {
        const request = await loadAuthorizedRequest(req, next);
        if (!request) return;

        await deleteRequest(request.id);
        res.redirect('/requests');
    } catch (err) {
        next(err);
    }
};

/* ----------------------------- Routes ----------------------------- */

router.get('/', requireLogin, showMyRequests);
router.get('/all', requireEmployee, showAllRequests);
router.get('/new', requireLogin, showNewRequestForm);

router.post('/',
    requireLogin,
    [
        body('item_name')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Item name must be at least 2 characters.'),
        body('requested_volume')
            .trim()
            .isFloat({ min: 0 })
            .withMessage('Estimated volume must be a number of 0 or more.'),
        body('pickup_date')
            .optional({ values: 'falsy' })
            .isISO8601()
            .withMessage('Pickup date must be a valid date.'),
        body('return_date')
            .optional({ values: 'falsy' })
            .isISO8601()
            .withMessage('Return date must be a valid date.'),
        body('item_description').trim().optional({ values: 'falsy' }),
        body('notes').trim().optional({ values: 'falsy' })
    ],
    handleCreateRequest
);

router.get('/:id', requireLogin, showRequestDetail);

// Update — edit a request's fields (owner of the request, or staff/owner)
router.get('/:id/edit', requireLogin, showEditRequestForm);
router.post('/:id/edit',
    requireLogin,
    [
        body('item_name')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Item name must be at least 2 characters.'),
        body('requested_volume')
            .trim()
            .isFloat({ min: 0 })
            .withMessage('Estimated volume must be a number of 0 or more.'),
        body('pickup_date')
            .optional({ values: 'falsy' })
            .isISO8601()
            .withMessage('Pickup date must be a valid date.'),
        body('return_date')
            .optional({ values: 'falsy' })
            .isISO8601()
            .withMessage('Return date must be a valid date.'),
        body('item_description').trim().optional({ values: 'falsy' }),
        body('notes').trim().optional({ values: 'falsy' })
    ],
    handleEditRequest
);

// Update — advance workflow status (staff/owner only)
router.post('/:id/status', requireEmployee, handleStatusChange);

// Delete — remove a request (owner of the request, or staff/owner)
router.post('/:id/delete', requireLogin, handleDeleteRequest);

export default router;
