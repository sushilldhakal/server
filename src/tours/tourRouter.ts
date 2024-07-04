import express from 'express';
import {searchTours, getTour, createTour, updateTour, deleteTour, getAllTours, getLatestTours, getToursByRating, getDiscountedTours} from './tourController';

const router = express.Router();

// Routes for '/tours'
router.get('/search', searchTours); // Ensure this route is defined correctly

router.get('/latest', getLatestTours);

router.get('/rating', getToursByRating);

router.get('/discounted', getDiscountedTours);


router.route('/')
  .get(getAllTours)
  .post(createTour);

router.route('/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

export default router;