import express from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
    createReview,
    getTourReviews,
    getReview,
    updateReview,
    deleteReview,
    getTourRating
} from './reviewController';

const router = express.Router({ mergeParams: true }); // mergeParams allows access to params from parent router

// Public routes
router.get('/tour/:tourId', getTourReviews);
router.get('/tour/:tourId/rating', getTourRating);
router.get('/:reviewId', getReview);

// Protected routes
router.use(authenticate); // All routes below this middleware require authentication
router.post('/tour/:tourId', createReview);
router.patch('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

export default router;