import { Response, NextFunction } from 'express';
import Gallery from './galleryModel'; 
import { GalleryDocument } from './galleryTypes';
import cloudinary from '../config/cloudinary';
import createHttpError from 'http-errors';
import { AuthRequest } from '../middlewares/authenticate';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

interface CloudinaryApiResponse {
  resources: CloudinaryResource[];
  next_cursor: string | null;
}

interface CloudinaryResource {
  secure_url: string;
  [key: string]: any; // Adjust according to the actual structure of the resource
}


export const getImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, roles } = req; // Assuming roles and userId are attached to the request object
    const { pageSize = '50' } = req.query;
    // Handle pageSize with proper type checks
    const parsedPageSize = Number(pageSize);
    if (isNaN(parsedPageSize) || parsedPageSize < 1) {
      return next(createHttpError(400, 'Invalid pageSize parameter'));
    }
    // Fetch resources from Cloudinary
    const fetchResources = async (prefix: string, resourceType: string = 'image', maxResults: number = parsedPageSize): Promise<CloudinaryApiResponse> => {
      return new Promise((resolve, reject) => {
        cloudinary.api.resources(
          {
            type: 'upload',
            prefix,
            resource_type: resourceType,
            max_results: maxResults,
          },
          (err: any, result: CloudinaryApiResponse) => {
            if (err) {
              console.error('Error fetching resources:', err);
              return reject(err);
            }
            resolve(result);
          }
        );
      });
    };

    let resources: CloudinaryResource[] = [];

    if (roles === 'admin') {
      const coverResources = await fetchResources('main/tour-cover', 'image', parsedPageSize);
      const pdfResources = await fetchResources('main/tour-pdf', 'raw', parsedPageSize);
      resources = [...coverResources.resources, ...pdfResources.resources];
    } else if (roles === 'seller') {
      const coverResources = await fetchResources(`main/tour-cover/${userId}`, 'image', parsedPageSize);
      const pdfResources = await fetchResources(`main/tour-pdf/${userId}`, 'raw', parsedPageSize);
      resources = [...coverResources.resources, ...pdfResources.resources];
    } else {
      return next(createHttpError(403, 'Access forbidden: Admins and Sellers only'));
    }

    res.json({
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};
  
  export const addImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const { description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    try {
      let gallery: GalleryDocument | null = await Gallery.findOne({ user: userId });
      if (!gallery) {
        gallery = new Gallery({ user: userId, images: [] });
      }
  
      if (!files || (!files.coverImage?.length && !files.file?.length)){
        return res.status(400).json({ message: 'No files were uploaded' });
      }
  
      const uploadPromises: Promise<void>[] = [];
  
      if (files.coverImage && files.coverImage.length > 0) {
        files.coverImage.forEach((file) => {
          const filePath = path.resolve(__dirname, '../../public/data/uploads', file.filename);
          const uploadPromise = cloudinary.uploader.upload(filePath, {
            folder: 'main/tour-cover',
          }).then(result => {
            const newImage = {
              _id: new mongoose.Types.ObjectId(),
              url: result.secure_url,
              asset_id: result.asset_id,
              description: description || '',
              uploadedAt: new Date(),
            };
            gallery.images.push(newImage);
            return fs.promises.unlink(filePath);
          }).catch(error => {
            throw error;
          })
          uploadPromises.push(uploadPromise);
        });
      }
  
      if (files.file && files.file.length > 0) {
        files.file.forEach((file) => {
          const filePath = path.resolve(__dirname, '../../public/data/uploads', file.filename);
          const uploadPromise = cloudinary.uploader.upload(filePath, {
            folder: 'main/tour-pdf',
            resource_type: 'raw',
          }).then(result => {
            const newImage = {
              _id: new mongoose.Types.ObjectId(),
              url: result.secure_url,
              asset_id: result.asset_id,
              description: description || '',
              uploadedAt: new Date(),
            };
            gallery.images.push(newImage);
            return fs.promises.unlink(filePath);
          }).catch(error => {
            throw error;
          })
          uploadPromises.push(uploadPromise);
        });
      }
  
      await Promise.all(uploadPromises);
      await gallery.save();
      res.json(gallery.images);
    } catch (error) {
      next(error);
    }
  };

  export const updateImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, imageId } = req.params;
      const { description } = req.body;
  
      const gallery: GalleryDocument | null = await Gallery.findOne({ user: userId });
  
      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }
  
      const image = gallery.images.find((img) => img._id.toString() === imageId);  
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
  
      if (description) {
        image.description = description;
      }
  
      await gallery.save();
  
      res.json(gallery.images);
    } catch (error) {
      next(error);
    }
  };

  export const deleteImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, roles } = req;
      const paramUserId = req.params.userId;
      const { imageIds } = req.body; // Expect an array of image IDs
  
      // Check if the user is admin or the owner of the images
      if (roles !== 'admin' && userId !== paramUserId) {
        return next(createHttpError(403, 'Access forbidden: Admins and Sellers only'));
      }
  
      // Find the gallery by userId
      const gallery: GalleryDocument | null = await Gallery.findOne({ user: paramUserId });
      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }
  
      // Find the images to delete
      const imagesToDelete = gallery.images.filter(img => imageIds.includes(img.asset_id));
      if (imagesToDelete.length === 0) {
        return res.status(404).json({ message: 'No images found to delete' });
      }
  
      // Delete images from Cloudinary
      for (const image of imagesToDelete) {
        const publicId = image.url.split('/').slice(-2).join('/').split('.')[0]; // Extract publicId from URL
        if (!publicId) {
          return next(createHttpError(400, 'Invalid image URL'));
        }
        if (image.url.includes('tour-cover')) {
          await cloudinary.uploader.destroy(`main/tour-cover/${publicId}`);
        } else if (image.url.includes('tour-pdf')) {
          await cloudinary.uploader.destroy(`main/tour-pdf/${publicId}`, { resource_type: 'raw' });
        }
      }
  
      // Remove images from gallery
      gallery.images = gallery.images.filter(img => !imageIds.includes(img._id.toString()));
      await gallery.save();
  
      res.json({ message: 'Images deleted successfully', images: gallery.images });
    } catch (error) {
      next(error);
    }
  };