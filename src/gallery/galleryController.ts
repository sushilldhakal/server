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
  asset_id: string;
  public_id: string;
  folder: string;
  filename: string;
  format: string;
  resource_type: string;
  type: string;
  created_at: string;
  url: string;
  secure_url: string;
}

export const getImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, roles } = req; // Assuming roles and userId are attached to the request object
    const { pageSize = '10', nextCursor } = req.query;
    
    // Handle pageSize with proper type checks
    const parsedPageSize = Number(pageSize);
    if (isNaN(parsedPageSize) || parsedPageSize < 1) {
      return next(createHttpError(400, 'Invalid pageSize parameter'));
    }

    // Fetch resources from Cloudinary
    const fetchResources = async (
      prefix: string, 
      resourceType: string = 'image', 
      maxResults: number = parsedPageSize, 
      nextCursor?: string
    ): Promise<CloudinaryApiResponse> => {
      return new Promise((resolve, reject) => {
        cloudinary.api.resources(
          {
            type: 'upload',
            prefix: 'main/tour-cover/',
            resource_type: resourceType,
            max_results: maxResults,
            next_cursor: nextCursor,
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
    let nextCursorResponse: string | null = null;

    if (roles === 'admin') {
      const coverResources = await fetchResources('main/tour-cover', 'image', parsedPageSize, nextCursor as string);
      const pdfResources = await fetchResources('main/tour-pdf', 'raw', parsedPageSize, nextCursor as string);
      resources = [...coverResources.resources, ...pdfResources.resources];
      nextCursorResponse = coverResources.next_cursor || pdfResources.next_cursor;
    } else if (roles === 'seller') {
      const coverResources = await fetchResources(`main/tour-cover/${userId}`, 'image', parsedPageSize, nextCursor as string);
      const pdfResources = await fetchResources(`main/tour-pdf/${userId}`, 'raw', parsedPageSize, nextCursor as string);
      resources = [...coverResources.resources, ...pdfResources.resources];
      nextCursorResponse = coverResources.next_cursor || pdfResources.next_cursor;
    } else {
      return next(createHttpError(403, 'Access forbidden: Admins and Sellers only'));
    }


    resources.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      data: resources,
      nextCursor: nextCursorResponse,
    });
  } catch (error) {
    next(error);
  }
};
  export const addImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const { description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log("files ", req.files)

    try {
      let gallery: GalleryDocument | null = await Gallery.findOne({ user: userId });
      if (!gallery) {
        gallery = new Gallery({ user: userId, images: [], PDF: [] });
      }
      if (!files || (!files.imageList && !files.pdf)) {
        return res.status(400).json({ message: 'No files were uploaded' });
    }
      const uploadPromises: Promise<void>[] = [];

      if (files.imageList) {
        files.imageList.forEach((file) => {
          const filePath = path.resolve(__dirname, '../../public/data/uploads/multi', file.filename);
          const uploadPromise = cloudinary.uploader.upload(filePath, {
            folder: 'main/tour-cover/',
            resource_type: 'image',
        }).then(result => {
            console.log('Upload result for image:', result); 
            const newImage = {
                _id: new mongoose.Types.ObjectId(),
                url: result.secure_url,
                asset_id: result.asset_id,
                description: description || '',
                uploadedAt: new Date(),
            };
            if (gallery) {
              gallery.images.push(newImage);
            }
            return fs.promises.unlink(filePath);

            
        }).catch(error => {
            console.error('Error uploading image:', error);
            throw error;
        });

        uploadPromises.push(uploadPromise);
    });


    // Handle PDF uploads
    if (files.pdf) {
      files.pdf.forEach((file) => {
          const filePath = path.resolve(__dirname, '../../public/data/uploads/multi', file.filename);

          const uploadPromise = cloudinary.uploader.upload(filePath, {
              folder: 'main/tour-pdf/',
              resource_type: 'raw',
          }).then(result => {
              console.log('Upload result for PDF:', result); 
              const newPDF = {
                  _id: new mongoose.Types.ObjectId(),
                  url: result.secure_url,
                  asset_id: result.asset_id,
                  description: description || '',
                  uploadedAt: new Date(),
              };

              if (gallery) {
                gallery.PDF.push(newPDF);
              }

              return fs.promises.unlink(filePath);
          }).catch(error => {
              console.error('Error uploading PDF:', error);
              throw error;
          });

          uploadPromises.push(uploadPromise);
      });
  }
}
      await Promise.all(uploadPromises);

      if (gallery) {
        await gallery.save();
        gallery = await Gallery.findOne({ user: userId }).populate('images').exec();
        if (gallery) {
          res.json(gallery.images);
        } else {
          res.status(404).json({ message: 'Gallery not found' });
        }
      } else {
        res.status(404).json({ message: 'Gallery not found' });
      }
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


  // Extract publicId from the URL
const extractPublicId = (url: string) => {
  const parts = url.split('/');
  const fileName = parts.pop(); // Get the last part of the URL
  const publicId = fileName?.split('.')[0]; // Remove the file extension
  return publicId;
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
        const publicId = extractPublicId(image.url);
        if (!publicId) {
            return next(createHttpError(400, 'Invalid image URL'));
        }

        if (image.url.includes('tour-cover')) {
          await cloudinary.uploader.destroy(`main/tour-cover/${publicId}`)
        } else if (image.url.includes('tour-pdf')) {
          await cloudinary.uploader.destroy(`main/tour-pdf/${publicId}`)
        }
    }
      // Remove images from gallery
      gallery.images = gallery.images.filter(img => !imageIds.includes(img.asset_id.toString()));
      await gallery.save();
      res.json({ message: 'Images deleted successfully', images: gallery.images });
    } catch (error) {
      next(error);
    }
  };