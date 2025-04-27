import express from 'express';
import * as fixedDepartureController from './fixedDepartureController';
import { authenticate } from '../../middlewares/authenticate';

const router = express.Router();

// Get all active fixed departures across all tours
router.get('/active', fixedDepartureController.getActiveFixedDepartures);

// Routes for specific tour's fixed departures
router.get('/:tourId/departures', fixedDepartureController.getFixedDepartures);
router.get('/:tourId/departures/:departureId', fixedDepartureController.getFixedDepartureById);

// Protected routes - require authentication
router.post('/:tourId/departures', authenticate, fixedDepartureController.createFixedDeparture);
router.put('/:tourId/departures/:departureId', authenticate, fixedDepartureController.updateFixedDeparture);
router.delete('/:tourId/departures/:departureId', authenticate, fixedDepartureController.deleteFixedDeparture);
router.post('/:tourId/departures/:departureId/cancel', authenticate, fixedDepartureController.cancelFixedDeparture);
router.post('/:tourId/departures/:departureId/notify', authenticate, fixedDepartureController.addNotification);

export default router;
