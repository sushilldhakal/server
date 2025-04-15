import express from 'express';
import { 
  getAllDestinations, 
  getDestination, 
  createDestination, 
  updateDestination, 
  deleteDestination, 
  getToursByDestination,
  getPopularDestinations
} from './destinationController';
import { authenticate } from "../../middlewares/authenticate";
import { uploadNone } from "../../middlewares/multer";

const destinationRouter = express.Router();

// Public routes
destinationRouter.get("/", getAllDestinations);
destinationRouter.get("/popular", getPopularDestinations);
destinationRouter.get("/:destinationId", getDestination);
destinationRouter.get("/:destinationId/tours", getToursByDestination);

// Protected routes (require authentication)
destinationRouter.post("/", authenticate, uploadNone, createDestination);
destinationRouter.patch("/:destinationId", authenticate, uploadNone, updateDestination);
destinationRouter.delete("/:destinationId", authenticate, deleteDestination);

export default destinationRouter;
