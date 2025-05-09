
import express, { NextFunction } from "express";
import { addMedia, deleteMedia, getMedia, getSingleMedia, updateMedia } from "./galleryController";
import {authenticate, isAdminOrSeller} from "../../middlewares/authenticate";
import { uploadMultiple, uploadNone } from "../../middlewares/multer";
const galleryRoutes = express.Router();



galleryRoutes.get('/media', authenticate as any, isAdminOrSeller as any, getMedia as any);
galleryRoutes.get('/:publicId', getSingleMedia as any);
galleryRoutes.post('/:userId/', authenticate as any, uploadMultiple, addMedia as any);
galleryRoutes.patch('/:userId/:imageId', authenticate as any, uploadNone , updateMedia as any);
galleryRoutes.delete('/:userId', authenticate as any, deleteMedia as any);


export default galleryRoutes;