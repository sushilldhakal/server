import express from 'express';
import { 
  createTour, deleteTour, getAllTours, getLatestTours, getTour, getUserTours, 
  searchTours, updateTour, getToursByRating, getDiscountedTours, getSpecialOfferTours, 
  incrementTourViews, incrementTourBookings, 
  getUserToursTitle
} from './tourController';
import { authenticate } from "../../middlewares/authenticate";
import { uploadNone } from "../../middlewares/multer";
import mongoose from 'mongoose';

const tourRouter = express.Router();

// Define specific routes before more generic ones

// Get all tours - this should be FIRST to ensure it's not caught by other routes
tourRouter.get("/", (req, res, next) => {
  console.log("Tour route query params:", req.query);
  getAllTours(req, res, next);
});

// Get a specific tour by ID - using a more specific path
tourRouter.get('/single/:tourId', (req, res, next) => {
  const { tourId } = req.params;
  console.log("Getting single tour by ID:", tourId);
  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    console.log("Invalid Tour ID");
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }
  getTour(req, res, next);
});

// Get tour titles by user ID
tourRouter.get("/user/:userId/titles", authenticate, getUserToursTitle);

// Get tours by user ID
tourRouter.get("/user/:userId", authenticate, getUserTours);

// Get top rated tours
tourRouter.get("/rating", (req, res, next) => {
  getToursByRating(req, res, next);
});

// Get discounted tours
tourRouter.get("/discounted", (req, res, next) => {
  getDiscountedTours(req, res, next);
});

// Get special offer tours
tourRouter.get("/special-offers", (req, res, next) => {
  getSpecialOfferTours(req, res, next);
});

// Search tours
tourRouter.get("/search", (req, res, next) => {
  searchTours(req, res, next);
});

// Get latest tours
tourRouter.get("/latest", (req, res, next) => {
  getLatestTours(req, res, next);
});

// Increment tour view count
tourRouter.post("/:tourId/views", (req, res, next) => {
  incrementTourViews(req, res, next);
});

// Increment tour booking count
tourRouter.post("/:tourId/bookings", authenticate, (req, res, next) => {
  incrementTourBookings(req, res, next);
});

// Handle static routes and fallback to getTour for valid IDs
tourRouter.get('/:tourId', (req, res, next) => {
  const { tourId } = req.params;
  console.log("tour id:", tourId);
  
  // Check if tourId is a static route name and handle it
  const staticRoutes = ["latest", "search", "rating", "discounted", "special-offers"];
  if (staticRoutes.includes(tourId)) {
    // Let express handle static routes or handle as needed
    console.log("Handling static route:", tourId);
    return next(); // Pass to next handler for static routes
  }
  
  // For backward compatibility, check if it's a valid ID and get the tour
  if (mongoose.Types.ObjectId.isValid(tourId)) {
    console.log("Valid tour ID, getting tour");
    return getTour(req, res, next);
  }
  
  // If we reach here, it's neither a static route nor a valid ID
  console.log("Invalid Tour ID or route");
  return res.status(404).send('Not Found');
});

tourRouter.post("/", authenticate, uploadNone, createTour);
tourRouter.patch("/:tourId", authenticate, uploadNone, updateTour);
tourRouter.delete("/:tourId", authenticate, deleteTour);

export default tourRouter;