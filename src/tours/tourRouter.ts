import path from "node:path";
import express from 'express';
import {createTour, deleteTour, getAllTours, getLatestTours, getTour, updateTour} from './tourController';
import multer from "multer";
import {authenticate} from "../middlewares/authenticate";
import { uploadNone } from "../middlewares/multer";



const tourRouter = express.Router();


tourRouter.post(
  "/",
  authenticate, uploadNone,
  createTour
);

tourRouter.patch(
  "/:tourId",
  authenticate,
 uploadNone,
  updateTour
);

// Routes for '/tours'
//tourRouter.get('/search', searchTours); // Ensure this route is defined correctly

tourRouter.get('/latest', getLatestTours);

// tourRouter.get('/rating', getToursByRating);

// tourRouter.get('/discounted', getDiscountedTours);


tourRouter.get("/", getAllTours);
// tourRouter.get("/:tourId", getTour);

tourRouter.get("/:tourId", (req, res, next) => {
  const { tourId } = req.params;

  // Check if the tourId matches any static route names
  const staticRoutes = ["latest", "search", "rating", "discounted"];
  if (staticRoutes.includes(tourId)) {
    return next(); // Pass control to the next matching route
  }

  // Otherwise, proceed to get the tour by ID
  getTour(req, res, next);
});

// DELETE /api/tours/:tourId
tourRouter.delete("/:tourId", authenticate, deleteTour);




export default tourRouter;