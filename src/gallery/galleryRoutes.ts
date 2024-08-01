
import express from "express";
import { addImage, deleteImages, getImages, updateImage } from "./galleryController";
import {authenticate, isAdminOrSeller} from "../middlewares/authenticate";
import { uploadMultiple } from "../middlewares/multer";

const galleryRoutes = express.Router();


//routes
galleryRoutes.get('/images', authenticate as any, isAdminOrSeller as any, getImages as any);
galleryRoutes.post('/:userId/', authenticate as any,uploadMultiple, addImage as any);
galleryRoutes.put('/:userId/:imageId', authenticate as any, updateImage as any);
galleryRoutes.delete('/:userId', authenticate as any, deleteImages as any);


export default galleryRoutes;