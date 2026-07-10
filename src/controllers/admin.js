import { Router } from 'express';
import { requireAdmin, requireEmployee } from '../middleware/auth.js';
import { getAllUsers, updateUserRole } from '../models/forms/registration.js';
import { getAllContactMessages, updateContactMessageStatus } from '../models/forms/contact.js';
import {
    getAllRequests,
    getAllReviews,
    REQUEST_STATUSES,
    updateRequestStatus,
    deleteReview
} from '../models/requests/requests.js';

const router = Router();

const showAdminDashboard = async (req, res, next) => {
    try {
        const [users, requests, messages, reviews] = await Promise.all([
            getAllUsers(),
            getAllRequests(),
            getAllContactMessages(),
            getAllReviews()
        ]);

        res.render('admin/dashboard', {
            title: 'Admin dashboard',
            users,
            requests,
            messages,
            reviews,
            REQUEST_STATUSES,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        next(error);
    }
};

const handleUserRoleUpdate = async (req, res, next) => {
    const userId = Number.parseInt(req.params.id, 10);
    const role = req.body.role;

    if (Number.isNaN(userId)) {
        return res.redirect('/admin');
    }

    if (!['owner', 'staff', 'customer'].includes(role)) {
        return res.redirect('/admin');
    }

    if (req.session.user && req.session.user.id === userId && role !== 'owner') {
        return res.redirect('/admin?error=You cannot change your own role.');
    }

    try {
        await updateUserRole({ userId, role });
        return res.redirect('/admin?success=User+role+updated.');
    } catch (error) {
        next(error);
    }
};

const handleRequestStatusUpdate = async (req, res, next) => {
    const requestId = Number.parseInt(req.params.id, 10);
    const status = req.body.status;

    if (Number.isNaN(requestId)) {
        return res.redirect('/admin');
    }

    if (!REQUEST_STATUSES.includes(status)) {
        return res.redirect('/admin');
    }

    try {
        await updateRequestStatus({
            requestId,
            status,
            changedBy: req.session.user.id,
            note: req.body.note || 'Status updated from admin dashboard'
        });
        return res.redirect('/admin?success=Request+status+updated.');
    } catch (error) {
        next(error);
    }
};

const handleContactStatusUpdate = async (req, res, next) => {
    const messageId = Number.parseInt(req.params.id, 10);
    const status = req.body.status;

    if (Number.isNaN(messageId)) {
        return res.redirect('/admin');
    }

    if (!['received', 'replied', 'closed'].includes(status)) {
        return res.redirect('/admin');
    }

    try {
        await updateContactMessageStatus({ messageId, status });
        return res.redirect('/admin?success=Submission+status+updated.');
    } catch (error) {
        next(error);
    }
};

const handleReviewDelete = async (req, res, next) => {
    const reviewId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(reviewId)) {
        return res.redirect('/admin');
    }

    try {
        await deleteReview(reviewId);
        return res.redirect('/admin?success=Review+removed.');
    } catch (error) {
        next(error);
    }
};

router.get('/', requireAdmin, showAdminDashboard);
router.post('/users/:id/role', requireAdmin, handleUserRoleUpdate);
router.post('/requests/:id/status', requireEmployee, handleRequestStatusUpdate);
router.post('/messages/:id/status', requireEmployee, handleContactStatusUpdate);
router.post('/reviews/:id/delete', requireEmployee, handleReviewDelete);

export default router;
