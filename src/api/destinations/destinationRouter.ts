import express from 'express';
import { 
  getAllDestinations, 
  getDestination, 
  createDestination, 
  updateDestination, 
  deleteDestination, 
  getToursByDestination,
  getPopularDestinations,
  getUserDestinations
} from './destinationController';
import { authenticate, AuthRequest } from "../../middlewares/authenticate";
import { uploadNone } from "../../middlewares/multer";

const destinationRouter = express.Router();

// Public routes
destinationRouter.get("/", getAllDestinations as any);

destinationRouter.get("/popular", getPopularDestinations);

destinationRouter.get("/user", authenticate, getUserDestinations as any);


destinationRouter.get("/:destinationId", getDestination as any);
destinationRouter.get("/:destinationId/tours", getToursByDestination as any);

// Protected routes (require authentication)
destinationRouter.post("/", authenticate, uploadNone, createDestination);





destinationRouter.patch("/:destinationId", authenticate, uploadNone, updateDestination);
destinationRouter.delete("/:destinationId", authenticate, deleteDestination);

export default destinationRouter;
