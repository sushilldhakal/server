import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';
import cloudinary from '../../config/cloudinary';
import { AuthRequest } from "../../middlewares/authenticate";
import mongoose from 'mongoose';
import { FactValue } from './tourTypes';


export const createTour = async (req: Request, res: Response, next: NextFunction) => {
  const {  title,
    coverImage,
    code,
    description,
    tourStatus,
    category,
    price,
    file,
    outline,
    itinerary,
    dates,
    facts,
    faqs,
    gallery,
    map,
    include,
    exclude,
    location,
  enquiry} = req.body;
  console.log("createTour", req.body)
  try {
      const _req = req as AuthRequest;
      const parsedItinerary: { day: string, title: string, description: string, date: Date }[] = [];
   // Check if itinerary is provided and parse it
   if (Array.isArray(itinerary)) {
    for (const item of itinerary) {
      parsedItinerary.push({
        day: item.day || '',
        title: item.title || '',
        description: item.description || '',
        date: item.date ? new Date(item.date) : new Date(), // Ensure date is handled correctly
      });
    }
  }
 // Initialize an array to store both categoryId and categoryName
 const categories = Array.isArray(category) ? category.map(item => ({
  categoryId: mongoose.Types.ObjectId.isValid(item.value) ? new mongoose.Types.ObjectId(item.value) : null,
  categoryName: item.label || '',
})).filter(item => item.categoryId) : [];

// Parse Facts
const parsedFacts = Array.isArray(facts) ? facts.map(item => ({
  title: item.title || '',
  field_type: item.field_type || 'Plain Text',
  value: Array.isArray(item.value) ? item.value.map((val: FactValue) => 
    typeof val === 'object' && val.value ? val.value : val
  ) : [],
  icon: item.icon || '',
})) : [];

 // Parse Dates
 const parsedDates = dates ? {
  tripDuration: dates.tripDuration || '',
  startDate: dates.startDate ? new Date(dates.startDate) : null,
  endDate: dates.endDate ? new Date(dates.endDate) : null,
} : {};

// Parse Location
const parsedLocation = location ? {
  street: location.street || '',
  city: location.city || '',
  state: location.state || '',
  country: location.country || '',
  lat: parseFloat(location.lat) || 0,
  lng: parseFloat(location.lng) || 0,
} : {};

    
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
          include,
          exclude,
          category: categories,
          itinerary: parsedItinerary,
          dates: parsedDates,
          facts: parsedFacts,
          faqs: Array.isArray(faqs) ? faqs.map(item => ({
            question: item.question || '',
            answer: item.answer || '',
          })) : [],
          gallery: Array.isArray(gallery) ? gallery.map(item => ({
            image: item.image || '',
          })) : [],
          map: map || '',
          location: parsedLocation,
          enquiry: enquiry || true, // Assuming default value as true
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
  console.log("getAllTours")
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
  console.log("getTour", tourId)
  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }

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
  const {title,
    coverImage,
    file,
    description,
    category,
    tourStatus,
    price,
    outline,
    itinerary,
    dates,
    facts,
    faqs,
    gallery,
    map,
    include,
    exclude,
    location,
  enquiry } = req.body;
  const tourId = req.params.tourId;
  console.log("updateTour", tourId)
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
    if (Array.isArray(itinerary)) {
     for (const item of itinerary) {
       parsedItinerary.push({
         day: item.day || '',
         title: item.title || '',
         description: item.description || '',
         date: item.date ? new Date(item.date) : new Date, // Ensure date is handled correctly
       });
     }
   }

    // Update categories
    const updatedCategories: { categoryName: string, categoryId: string }[] = [];
    if (Array.isArray(category)) {
      for (const item of category) {
        // Assuming item.value is the ID and item.label is the name
        updatedCategories.push({
          categoryName: item.label,
          categoryId: item.value,
        });
      }
    }

      // Parse Facts
      const parsedFacts = Array.isArray(facts) ? facts.map(item => ({
        title: item.title || '',
        field_type: item.field_type || 'Plain Text',
        value: Array.isArray(item.value) ? item.value.map((val: FactValue) => 
          typeof val === 'object' && val.value ? val.value : val
        ) : [],
        icon: item.icon || '',
      })) : [];
  
      // Parse Dates
      const parsedDates = dates ? {
        tripDuration: dates.tripDuration || '',
        startDate: dates.startDate ? new Date(dates.startDate) : null,
        endDate: dates.endDate ? new Date(dates.endDate) : null,
      } : undefined;
  
      // Parse Location
      const parsedLocation = location ? {
        street: location.street || '',
        city: location.city || '',
        state: location.state || '',
        country: location.country || '',
        lat: parseFloat(location.lat) || 0,
        lng: parseFloat(location.lng) || 0,
      } : undefined;


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
        category: updatedCategories.length > 0 ? updatedCategories : tour.category,  // Update category or keep the existing one
        outline: outline || tour.outline,
        itinerary: parsedItinerary || tour.itinerary,
        dates: parsedDates || tour.dates,
        include: include || tour.include,
        exclude: exclude || tour.exclude,
        facts: parsedFacts.length > 0 ? parsedFacts : tour.facts,
        faqs: Array.isArray(faqs) ? faqs.map(item => ({
          question: item.question || '',
          answer: item.answer || '',
        })) : tour.faqs,
        gallery: Array.isArray(gallery) ? gallery.map(item => ({
          image: item.image || '',
        })) : tour.gallery,
        map: map || tour.map,
        location: parsedLocation || tour.location,
        enquiry: enquiry || tour.enquiry,
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
  console.log("deleteTour", tourId)
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
    // Delete tour from the database
    await tourModel.deleteOne({ _id: tourId });
    return res.sendStatus(204);
  } catch (err) {
    console.error('Error in deleteTour:', err);
    next(createHttpError(500, "Error while deleting the tour"));
  }
};

// Get latest created tours
export const getLatestTours = async (req: Request, res: Response, next: NextFunction) => {
  // Add logging to handlers
  try {
      const tours = await tourModel.find().populate("author", "name").sort({ createdAt: -1 }).limit(10).exec();
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
export const searchTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query: Record<string, any> = {};
    console.log("query",req.query)
    if (req.query.name) {
      query.title = { $regex: req.query.name as string, $options: 'i' };
    }

    if (req.query.destinations) {
      query['locations.city'] = { $in: (req.query.destinations as string).split(',') };
    }

    if (req.query.category) {
      const categoryQuery = req.query.category as string;

      // Check if it's an ObjectId (categoryId)
      if (mongoose.Types.ObjectId.isValid(categoryQuery)) {
        query['category.categoryId'] = categoryQuery;
      } else {
        // Otherwise, treat it as a category name search
        query['category.categoryName'] = { $regex: categoryQuery, $options: 'i' };
      }
    }

    console.log('Constructed Query:', query); // Logging the query object

    const tours = await tourModel.find(query);
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    console.error('Search Tours Error:', err);
    next(createHttpError(500, 'Failed to search tours'));
  }
};


