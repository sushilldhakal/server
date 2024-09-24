import express from "express";
import {authenticate, isAdminOrSeller} from "../../../middlewares/authenticate";


import { addCategory,getAllCategories, getUserCategories, updateCategory, deleteCategory, getSingleCategory } from "./categoryController";
import { uploadNone } from "../../../middlewares/multer";


const categoryRouter = express.Router();

// Add Category (Protected, Admin or Seller)
categoryRouter.post('/', authenticate, uploadNone, isAdminOrSeller as any, addCategory as any);

// Get All Categories (Public)
categoryRouter.get('/', getAllCategories as any);

// Get Categories for a Specific User (Protected, Admin or Seller)
categoryRouter.get('/user/:userId', authenticate, isAdminOrSeller as any, getUserCategories  as any);

// Get a Single Category by Category ID (Public)
categoryRouter.get('/:categoryId', getSingleCategory as any);

// Update a Category (Protected, Admin or Seller)
categoryRouter.patch('/:categoryId', authenticate, uploadNone, isAdminOrSeller as any, updateCategory as any);

// Delete a Category (Protected, Admin or Seller)
categoryRouter.delete('/:categoryId', authenticate, isAdminOrSeller as any, deleteCategory as any);

export default categoryRouter;