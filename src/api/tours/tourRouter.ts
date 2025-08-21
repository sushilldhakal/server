import express from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/authenticate';
import {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  searchTours,
  getLatestTours,
  getToursByRating,
  getDiscountedTours,
  getSpecialOfferTours,
  getUserTours,
  getUserToursTitle,
  incrementTourViews,
  incrementTourBookings
} from './controllers/tourController';
import {
  validateObjectId,
  validateTourCreation,
  validatePagination,
  validateSearchParams
} from './middleware/validation';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * Refactored Tour Routes with validation middleware
 */

// Public routes (no authentication required)
router.get('/', validatePagination, getAllTours);
router.get('/search', validateSearchParams, validatePagination, searchTours);
router.get('/latest', getLatestTours);
router.get('/by-rating', getToursByRating);
router.get('/discounted', getDiscountedTours);
router.get('/special-offers', getSpecialOfferTours);

// Analytics routes (public)
router.patch('/:tourId/views/increment', validateObjectId(), incrementTourViews);
router.patch('/:tourId/bookings/increment', validateObjectId(), incrementTourBookings);

// Protected routes (authentication required)
router.use(authenticate);

// User tour management (with userId parameter for frontend compatibility)
router.get('/user/:userId', validatePagination, getUserTours);
router.get('/user/:userId/titles', getUserToursTitle);

// CRUD operations with validation
router.post('/', 
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]), 
  validateTourCreation, 
  createTour
);

// This needs to come before the GET /:tourId route
router.patch('/:tourId', 
  validateObjectId(),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]), 
  updateTour
);

// This needs to come after all other specific routes
router.get('/:tourId', validateObjectId(), getTour);

router.delete('/:tourId', validateObjectId(), deleteTour);

export default router;