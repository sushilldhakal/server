import express from "express";
import {authenticate, isAdminOrSeller} from "../../../middlewares/authenticate";


import { addFaqs, getUserFaqs, updateFaqs, deleteFaqs, getAllFaqs, getSingleFaqs } from "./faqController";
import { uploadNone } from "../../../middlewares/multer";


const faqsRouter = express.Router();

faqsRouter.post('/', authenticate, uploadNone, isAdminOrSeller as any, addFaqs as any);

// Get All Categories (Public)
faqsRouter.get('/', getAllFaqs as any);

// Get Categories for a Specific User (Protected, Admin or Seller)
faqsRouter.get('/user/:userId', authenticate, isAdminOrSeller as any, getUserFaqs  as any);

// Get a Single Category by Category ID (Public)
faqsRouter.get('/:faqId', getSingleFaqs as any);

// Update a Category (Protected, Admin or Seller)
faqsRouter.patch('/:faqId', authenticate, uploadNone, isAdminOrSeller as any, updateFaqs as any);

// Delete a Category (Protected, Admin or Seller)
faqsRouter.delete('/:faqsId', authenticate, isAdminOrSeller as any, deleteFaqs as any);


export default faqsRouter;



