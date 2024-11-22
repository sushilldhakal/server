import express from 'express';
import { createTour, deleteTour, getAllTours, getLatestTours, getTour, getUserTours, searchTours, updateTour } from './tourController';
import { authenticate } from "../../middlewares/authenticate";
import { uploadNone } from "../../middlewares/multer";
import mongoose from 'mongoose';

const tourRouter = express.Router();

// Define specific routes before more generic ones

tourRouter.get("/",  (req, res, next) => {
  getAllTours(req, res, next);
});

tourRouter.get("/:userId",authenticate,getUserTours);

tourRouter.get('/:tourId', (req, res, next) => {
  const { tourId } = req.params;
  console.log("tour id:", tourId);
  if (!mongoose.Types.ObjectId.isValid(tourId)) {
   console.log("Invalid Tour ID");
  }
  // Check if tourId is a static route name and handle it
  const staticRoutes = ["latest", "search", "rating", "discounted"];
  if (staticRoutes.includes(tourId)) {
    // Let express handle static routes or handle as needed
    console.log("Invalid Tour ID");
    return res.status(404).send('Not Found'); // Send appropriate response if needed
  }
  // Handle specific tour if not a static route
  getTour(req, res, next);
});

tourRouter.post("/", authenticate, uploadNone, createTour);
tourRouter.patch("/:tourId", authenticate, uploadNone, updateTour);
tourRouter.delete("/:tourId", authenticate, deleteTour);

export default tourRouter;
