import { Response, NextFunction } from 'express';
import Gallery from './galleryModel'; 
import { GalleryDocument } from './galleryTypes';
// import cloudinary from '../config/cloudinary';
import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import UserSettings from "../user/userSettingModel";
import User from "../user/userModel";

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
  width:string;
  height:string;
  bytes:string;
}

interface CustomRequest extends Request {
  params: {
    publicId: string;
  };
  query: {
    userId: string;
    resourcesType: string;
  }
}



export const getSingleMedia = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.params;
    const { userId, resourcesType } = req.query; // Assume userId is passed in query
    if (!publicId) {
      return next(createHttpError(400, 'publicId parameter is required'));
    }
    // Determine which folder the publicId belongs to (images, pdfs, or videos)
    let folderPrefix;
    let mediaType: 'images' | 'PDF' | 'videos';
    let fetchPublicId;
    if (resourcesType === 'tour-pdf') {
      folderPrefix = 'main/tour-pdf/';
      mediaType = 'PDF';
      fetchPublicId = `${folderPrefix}${publicId}.pdf`;
    } else if (resourcesType === 'tour-cover') {
      folderPrefix = 'main/tour-cover/';
      mediaType = 'images';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else if (resourcesType === 'tour-video') {
      folderPrefix = 'main/tour-video/';
      mediaType = 'videos';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else {
      return next(createHttpError(400, 'Invalid mediaType'));
    }

    // Fetch image from MongoDB using asset_id
    const imageDetails = await Gallery.findOne(
      { [`${mediaType}.public_id`]: fetchPublicId },
      { [`${mediaType}.$`]: 1, user: 1 } // Get the image and the user who uploaded it
    ).exec();

    if (!imageDetails || !imageDetails[mediaType] || imageDetails[mediaType].length === 0) {
      return next(createHttpError(404, 'Image not found in gallery'));
    }
    const image = imageDetails[mediaType][0];
    const ownerId = imageDetails.user;
    // Fetch user roles from the database
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    const { roles } = user;
    // If the user is neither admin nor the owner, deny access
    if (!roles.includes('admin') && ownerId.toString() !== userId) {
      return next(createHttpError(403, 'Access denied: You are not authorized to view this image.'));
    }
    // Fetch the uploader's (seller's) Cloudinary credentials
    const cloudinaryResource = await fetchResourceByPublicId(mediaType, fetchPublicId, ownerId.toString(), res);

    if (!cloudinaryResource) {
      return next(createHttpError(404, 'Image not found on Cloudinary'));
    }
    // Respond with image details
    res.json({
      url: cloudinaryResource.secure_url,
      id:image._id,
      description: image.description,
      title: image.title,
      tags: image.tags,
      uploadedAt: image.uploadedAt,
      asset_id: image.asset_id,
      width: cloudinaryResource.width,
      height: cloudinaryResource.height,
      format: cloudinaryResource.format,
      bytes: cloudinaryResource.bytes,
      resource_type: cloudinaryResource.resource_type,
      created_at: cloudinaryResource.created_at,
      public_id: cloudinaryResource.public_id,
      secure_url: cloudinaryResource.secure_url,
    });
  } catch (error) {
    next(error);
  }
};

// Fetches Cloudinary resource using the uploader's Cloudinary credentials
const fetchResourceByPublicId = async (mediaType: string, publicId: string, ownerId: string, res: Response): Promise<CloudinaryResource | null> => {
  const settings = await UserSettings.findOne({ user: ownerId });
  if (!settings || !settings.cloudinaryCloud || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
    res.status(410).json({ error: 'Missing Cloudinary API key for the uploader.' });
    return null;
  }

  // Configure Cloudinary with the uploader's credentials
  cloudinary.config({
    cloud_name: settings.cloudinaryCloud,
    api_key: settings.cloudinaryApiKey,
    api_secret: settings.cloudinaryApiSecret,
  });

  return new Promise((resolve, reject) => {
    cloudinary.api.resource(
      publicId,
      mediaType === 'PDF' ? { resource_type: 'raw' } : mediaType === 'videos' ? { resource_type: 'video' } : undefined,
      (err: unknown, result: CloudinaryResource) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      }
    );
  });
};

export const getMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, roles } = req; // Assuming roles and userId are attached to the request object
    console.log(req.query)
    const { pageSize = '10', page = '1', mediaType } = req.query;
    if (!['images', 'pdfs', 'videos'].includes(mediaType as string)) {
      return next(createHttpError(400, 'Invalid mediaType parameter'));
    }

    // Handle pageSize and page with proper type checks
    const parsedPageSize = Number(pageSize);
    const parsedPage = Number(page);

    if (isNaN(parsedPageSize) || parsedPageSize < 1 || isNaN(parsedPage) || parsedPage < 1) {
      return next(createHttpError(400, 'Invalid pageSize or page parameter'));
    }

    // Set up the query to fetch the user's gallery
    const query = roles === 'admin'
      ? {} // Admin can access all galleries
      : { user: new mongoose.Types.ObjectId(userId) }; // Seller can only access their own gallery

   // Fetch galleries without skip and limit
   const galleries = await Gallery.find(query).sort({ createdAt: -1 }).exec();


    // Separate media into different arrays
    const images = mediaType === 'images' ? galleries.flatMap(gallery => gallery.images) : [];
    const pdfs = mediaType === 'pdfs' ? galleries.flatMap(gallery => gallery.PDF) : [];
    const videos = mediaType === 'videos' ? galleries.flatMap(gallery => gallery.videos) : [];

    // Sort media
    const sortedImages = images.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const sortedPdfs = pdfs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const sortedVideos = videos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

     // Slice the media array for pagination
     const responseMedia = mediaType === 'images'
     ? sortedImages.slice((parsedPage - 1) * parsedPageSize, parsedPage * parsedPageSize)
     : mediaType === 'pdfs'
     ? sortedPdfs.slice((parsedPage - 1) * parsedPageSize, parsedPage * parsedPageSize)
     : sortedVideos.slice((parsedPage - 1) * parsedPageSize, parsedPage * parsedPageSize);

   // Calculate if there's a next page based on the total number of media items
   const totalMediaCount = mediaType === 'images'
     ? sortedImages.length
     : mediaType === 'pdfs'
     ? sortedPdfs.length
     : sortedVideos.length;

   const hasNextPage = parsedPage * parsedPageSize < totalMediaCount;


    res.json({
    //[mediaType as string]: responseMedia,
    [mediaType as string]:responseMedia,
    page: parsedPage,
    pageSize: parsedPageSize,
    hasNextPage,
    nextCursor: hasNextPage ? parsedPage + 1 : null,
    totalImages: mediaType === 'images' ? images.length : 0,
    totalPDFs: mediaType === 'pdfs' ? pdfs.length : 0,
    totalVideos: mediaType === 'videos' ? videos.length : 0
    });

    console.log(parsedPage, parsedPageSize, hasNextPage, responseMedia.length)
  } catch (error) {
    next(error);
  }
};



const uploadFileToCloudinary = async (file: Express.Multer.File, folder: string, resourceType: string, title: string | undefined, description: string | undefined) => {
  const filePath = path.join(__dirname, '../../public/data/uploads/multi', file.filename);
  try {
    const options: UploadApiOptions = {
      folder,
      resource_type: resourceType as 'image' | 'raw' | 'video', // Cast to one of the valid resource types
    };
    const result = await cloudinary.uploader.upload(filePath, options);
    const fileData = {
      _id: new mongoose.Types.ObjectId(),
      url: result.secure_url,
      asset_id: result.asset_id,
      title: title || file.filename,
      description: description || '',
      uploadedAt: new Date(),
      tags: [result.original_filename],
      secure_url: result.secure_url,
      original_filename: result.original_filename,
      display_name: result.display_name,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
      created_at: new Date(result.created_at),
      pages: result.pages,
      bytes: result.bytes,
      type: result.type,
      etag: result.etag,
      placeholder: result.placeholder,
      asset_folder: result.asset_folder,
      api_key: result.api_key,
    };

    await fs.promises.unlink(filePath); // Remove the file after upload
    return fileData;
  } catch (error) {
    throw error;
  }
};

const handleUploads = async (files: any, title: string | undefined, description: string | undefined, gallery: GalleryDocument) => {
  const uploadPromises: Promise<any>[] = [];
  if (files.imageList) {
    files.imageList.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-cover/', 'image', title, description).then(data => {

        gallery.images.push(data);
      }));
    });
  }

  if (files.pdf) {
    files.pdf.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-pdf/', 'raw', title, description).then(data => {
        gallery.PDF.push(data);
      }));
    });
  }

  if (files.video) {
    files.video.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-video/', 'video', title, description).then(data => {
        gallery.videos.push(data);
      }));
    });
  }

  return Promise.all(uploadPromises);
};

export const addMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const { description, title } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    let gallery = await Gallery.findOne({ user: userId });
    if (!gallery) {
      gallery = new Gallery({ user: userId, images: [], PDF: [], videos: [] });
    }

    if (!files || (!files.imageList && !files.pdf && !files.video)) {
      return res.status(400).json({ message: 'No files were uploaded' });
    }

    const settings = await UserSettings.findOne({ user: userId });
    if (!settings || !settings.cloudinaryCloud || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
      return res.status(410).json({ error: 'Missing Cloudinary API key. Please add the Cloudinary API key to settings.' });
    }
    cloudinary.config({
      cloud_name: settings.cloudinaryCloud,
      api_key: settings.cloudinaryApiKey,
      api_secret: settings.cloudinaryApiSecret,
    });

    // Handle file uploads
    await handleUploads(files, title, description, gallery);

    await gallery.save(); // Save the gallery with uploaded files

    const populatedGallery = await Gallery.findOne({ user: userId }).populate('images').exec();
    if (populatedGallery) {
      res.json({ images: populatedGallery.images });
    } else {
      res.status(404).json({ message: 'Gallery not found' });
    }
  } catch (error) {
    next(error);
  }
};

  export const updateMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, imageId } = req.params;
      const { description, title, tags } = req.body;
      const {mediaType} = req.query;
      console.log(userId, imageId, mediaType)
      const gallery: GalleryDocument | null = await Gallery.findOne({ user: userId });
  
      if (!gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }
  
      let mediaItem;
    if (mediaType === 'image') {
      mediaItem = gallery.images.find((img) => img._id.toString() === imageId);
    } else if (mediaType === 'video') {
      mediaItem = gallery.videos.find((vid) => vid._id.toString() === imageId);
    } else if (mediaType === 'raw') {
      mediaItem = gallery.PDF.find((pdf) => pdf._id.toString() === imageId);
    } else {
      return res.status(400).json({ message: 'Invalid media type' });
    }
    console.log("mediaItem",mediaItem)

    console.log( req.body)
    // If the media item isn't found
    if (!mediaItem) {
      return res.status(404).json({ message: 'Media not found' });
    }
  
      if (description) {
        mediaItem.description = description;
      }
      if (title) {
        mediaItem.title = title;
      }
      if (tags) {
        mediaItem.tags = tags;
      }

      await gallery.save();
  
      res.json(gallery.images);
    } catch (error) {
      next(error);
    }
  };


export const deleteMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {

  console.log(req.body);
  try {
    const { userId, roles } = req;
    const paramUserId = req.params.userId;
    const { imageIds, mediaType } = req.body; // Expect an array of image IDs

    // Check if the user is admin or the owner of the images
    if (roles !== 'admin' && userId !== paramUserId) {
      return next(createHttpError(403, 'Access forbidden: Admins and Sellers only'));
    }

    // Get the actual owner of the images if the user is admin
    const AdminAsSeller = roles === 'admin' ? await findUserByPublicId(imageIds[0], mediaType) : userId;
    const settings = await UserSettings.findOne({ user: AdminAsSeller });

    if (!settings || !settings.cloudinaryCloud || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
      return res.status(410).json({ error: 'Missing Cloudinary API key' });
    }

    cloudinary.config({
      cloud_name: settings.cloudinaryCloud,
      api_key: settings.cloudinaryApiKey,
      api_secret: settings.cloudinaryApiSecret,
    });

    // Find the gallery by userId
    const gallery = await Gallery.findOne({ user: AdminAsSeller });
    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found' });
    }

    // Media type validation
    type MediaType = 'images' | 'videos' | 'PDF'; // Define valid media types
    if (!['images', 'videos', 'PDF'].includes(mediaType)) {
      return res.status(400).json({ message: 'Invalid media type' });
    }

    // Find the media (images, videos, or PDFs) to delete based on the `mediaType`
    const mediaToDelete = (gallery[mediaType as MediaType] as any[]).filter((media) =>
      imageIds.includes(media.public_id)
    );
    if (mediaToDelete.length === 0) {
      return res.status(404).json({ message: 'No media found to delete' });
    }

    // Delete media from Cloudinary
    for (const media of mediaToDelete) {
      const publicId = media.public_id;
      if (!publicId) {
        return next(createHttpError(400, 'Invalid media URL'));
      }
      await cloudinary.uploader.destroy(publicId);
    }

    // Remove media from gallery based on the media type
    gallery[mediaType as MediaType] = gallery[mediaType as MediaType].filter(
      (media) => !imageIds.includes(media.public_id)
    );
    await gallery.save();

    res.json({ message: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} deleted successfully`, media: gallery[mediaType as MediaType] });
  } catch (error) {
    next(error);
  }
};

// Helper function to find user by public_id
const findUserByPublicId = async (publicId: string, mediaType: string) => {
  try {
    const gallery = await Gallery.findOne({ [`${mediaType}.public_id`]: publicId }).populate('user');
    if (!gallery) {
      return { message: 'No gallery found with this public_id' };
    }
    return gallery.user._id.toString();
  } catch (error) {
    throw new Error(`Error finding user by public_id: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
