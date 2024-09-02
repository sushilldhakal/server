import path from 'node:path';
import fs from 'node:fs';
import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from "../middlewares/authenticate";


interface Files {
  coverImage?: Express.Multer.File[];
  file?: Express.Multer.File[];
}

export const createTour = async (req: Request, res: Response, next: NextFunction) => {
  const { title, coverImage, code, description,tourStatus, price, file, outline, itinerary } = req.body;
  console.log("itinerary",itinerary)
  try {
      const _req = req as AuthRequest;
      const parsedItinerary: { day: string, title: string, description: string, date: Date }[] = [];
   // Check if itinerary is provided and parse it
   if (Array.isArray(req.body.itinerary)) {
    for (const item of req.body.itinerary) {
      parsedItinerary.push({
        day: item.day || '',
        title: item.title || '',
        description: item.description || '',
        date: item.date ? new Date(item.date) : new Date, // Ensure date is handled correctly
      });
    }
  }
    
      const newTour = await tourModel.create({
          title,
          description,
          code,
          tourStatus,
          price,
          outline,
          author: _req.userId,
          coverImage,
          file,
          itinerary: parsedItinerary,
      });
      res.status(201).json({ id: newTour._id, message: newTour });
  } catch (err) {
      console.log(err);
      return next(createHttpError(500, "Error while uploading the files."));
  }
};

// Get all tours
export const getAllTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find().populate("author", "name");
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get tours'));
  }
};

//Get a single tour
export const getTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tourId = req.params.tourId;
  try {
      const tour = await tourModel
          .findOne({ _id: tourId })
          // populate author field
          .populate('author.name');
      if (!tour) {
          return next(createHttpError(404, "tour not found."));
      }
      const breadcrumbs = [
        {
          label: tour.title, // Use tour title for breadcrumb label
          url: `/${tourId}`, // Example URL
        }
      ];
      if (!breadcrumbs.length) {
        return next(createHttpError(404, 'Failed to get breadcrumbs'));
      }
      return res.json({ tour,  breadcrumbs});
  } catch (err) {
      return next(createHttpError(500, "Error while getting a tour"));
  }
};


// Update a tour
export const updateTour = async (req: Request, res: Response, next: NextFunction) => {
  const { title, coverImage, file,  description, tourStatus, price,outline, itinerary } = req.body;
  const tourId = req.params.tourId;
  try {
    const tour = await tourModel.findOne({ _id: tourId });
    if (!tour) {
      return next(createHttpError(404, "Tour not found"));
    }
    // Check access
    const _req = req as AuthRequest;
    if (!(tour.author.toString() == _req.userId || _req.roles == 'admin')) {
      return next(createHttpError(403, "You cannot update others' tour."));
    }

    const parsedItinerary: { day: string, title: string, description: string, date: Date }[] = [];
    // Check if itinerary is provided and parse it
    if (Array.isArray(req.body.itinerary)) {
     for (const item of req.body.itinerary) {
       parsedItinerary.push({
         day: item.day || '',
         title: item.title || '',
         description: item.description || '',
         date: item.date ? new Date(item.date) : new Date, // Ensure date is handled correctly
       });
     }
   }

     // Update tour with provided fields or keep existing ones
     const updatedTour = await tourModel.findByIdAndUpdate(
      tourId,
      {
        title: title || tour.title,
        description: description || tour.description,
        tourStatus: tourStatus || tour.tourStatus,
        coverImage:  coverImage || tour.coverImage,
        file: file || tour.file,
        price: price || tour.price,
        outline: outline || tour.outline,
        itinerary: parsedItinerary || tour.itinerary,
      },
      { new: true }
    );

    if (!updatedTour) {
      console.error('Failed to update tour in the database');
      return next(createHttpError(500, "Failed to update the tour"));
    }

    res.json(updatedTour);
  } catch (err) {
    console.error('Error in updateTour:', err);
    next(createHttpError(500, "Error while updating the tour"));
  }
};

// Delete a tour
export const deleteTour = async (req: Request, res: Response, next: NextFunction) => {
  const tourId = req.params.tourId;
  try {
    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, "Tour not found"));
    }
    // Check Access
    const _req = req as AuthRequest;
    if (!(tour.author.toString() == _req.userId || _req.roles.includes('admin'))) {
      return next(createHttpError(403,"You cannot delete others' tour."));
    }
    // Extract public IDs for deletion
    const coverFileSplits = tour.coverImage.split("/");
    const coverImagePublicId =
      coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);
    const tourFileSplits = tour.file.split("/");
    const tourFilePublicId =
      tourFileSplits.at(-2) + "/" + tourFileSplits.at(-1)?.split(".").at(-2);
    // Delete files from Cloudinary
    await cloudinary.uploader.destroy(coverImagePublicId);
    await cloudinary.uploader.destroy(tourFilePublicId, { resource_type: "raw" });
    // Delete tour from the database
    await tourModel.deleteOne({ _id: tourId });
    return res.sendStatus(204);
  } catch (err) {
    console.error('Error in deleteTour:', err);
    next(createHttpError(500, "Error while deleting the tour"));
  }
};

// Get latest created tours
export const getLatestTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      results: tours.length,
      tours,
    });
  } catch (err) {
    console.error('Get Latest Tours Error:', err);
    next(createHttpError(500, 'Failed to fetch latest tours'));
  }
};

// Get tours by rating
// export const getToursByRating = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const tours = await tourModel
//       .find()
//       .sort({ rating: -1 })
//       .limit(10);

//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     console.error('Get Tours by Rating Error:', err);
//     next(createHttpError(500, 'Failed to fetch tours by rating'));
//   }
// };

// Get discounted tours
// export const getDiscountedTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const tours = await tourModel.find({ discountPrice: { $exists: true, $ne: null } });

//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     console.error('Get Discounted Tours Error:', err);
//     next(createHttpError(500, 'Failed to fetch discounted tours'));
//   }
// };

// Search for tours
// export const searchTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const query: Record<string, any> = {};

//     if (req.query.name) {
//       query.title = { $regex: req.query.name as string, $options: 'i' };
//     }

//     if (req.query.destinations) {
//       query['locations.city'] = { $in: (req.query.destinations as string).split(',') };
//     }

//     if (req.query.type) {
//       query.type = req.query.type as string;
//     }

//     if (req.query.minDuration || req.query.maxDuration) {
//       query.duration = {};
//       if (req.query.minDuration) {
//         query.duration.$gte = parseInt(req.query.minDuration as string, 10);
//       }
//       if (req.query.maxDuration) {
//         query.duration.$lte = parseInt(req.query.maxDuration as string, 10);
//       }
//     }

//     if (req.query.startDate || req.query.endDate) {
//       query['dates.date'] = {};
//       if (req.query.startDate) {
//         query['dates.date'].$gte = new Date(req.query.startDate as string);
//       }
//       if (req.query.endDate) {
//         query['dates.date'].$lte = new Date(req.query.endDate as string);
//       }
//     }

//     if (req.query.minPrice || req.query.maxPrice) {
//       query['dates.price'] = {};
//       if (req.query.minPrice) {
//         query['dates.price'].$gte = parseInt(req.query.minPrice as string, 10);
//       }
//       if (req.query.maxPrice) {
//         query['dates.price'].$lte = parseInt(req.query.maxPrice as string, 10);
//       }
//     }


//     console.log('Constructed Query:', query); // Logging the query object

//     const tours = await tourModel.find(query);
//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     console.error('Search Tours Error:', err);
//     next(createHttpError(500, 'Failed to search tours'));
//   }
// };


