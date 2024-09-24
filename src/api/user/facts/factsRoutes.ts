import express from "express";
import {authenticate, isAdminOrSeller} from "../../../middlewares/authenticate";


import { addFacts,getAllFacts, getUserFacts, updateFacts, deleteFacts, getSingleFacts } from "./factsController";
import { uploadNone } from "../../../middlewares/multer";


const factsRouter = express.Router();

// Add Category (Protected, Admin or Seller)
factsRouter.post('/', authenticate, uploadNone, isAdminOrSeller as any, addFacts as any);

// Get All Categories (Public)
factsRouter.get('/', getAllFacts as any);

// Get Categories for a Specific User (Protected, Admin or Seller)
factsRouter.get('/user/:userId', authenticate, isAdminOrSeller as any, getUserFacts  as any);

// Get a Single Category by Category ID (Public)
factsRouter.get('/:factsId', getSingleFacts as any);

// Update a Category (Protected, Admin or Seller)
factsRouter.patch('/:factId', authenticate, uploadNone, isAdminOrSeller as any, updateFacts as any);

// Delete a Category (Protected, Admin or Seller)
factsRouter.delete('/:factsId', authenticate, isAdminOrSeller as any, deleteFacts as any);

export default factsRouter;