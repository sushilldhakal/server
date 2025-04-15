import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';
import { User } from '../user/userTypes';
import { default as userModel } from '../user/userModel';
import cloudinary from '../../config/cloudinary';
import { AuthRequest } from "../../middlewares/authenticate";
import mongoose from 'mongoose';
import { FactValue } from './tourTypes';
import { paginate, PaginationParams } from '../../utils/pagination';

// Create a tour
export const createTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast req to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    const {
      title,
      coverImage,
      code,
      description,
      tourStatus,
      price,
      originalPrice,
      // New pricing structure fields
      basePrice,
      pricePerPerson,
      groupSize,
      saleEnabled,
      salePrice,
      pricingOptionsEnabled,
      pricingGroups,
      category,
      outline,
      itinerary,
      dates,
      include,
      exclude,
      facts,
      faqs,
      gallery,
      map,
      location,
      discount,
      enquiry,
      isSpecialOffer,
      destination
    } = req.body;

    // Validate required fields
    if (!title || !code) {
      return next(
        createHttpError(400, "Title and code are required fields")
      );
    }

    // Create a new tour
    const newTour = new tourModel({
      title,
      code,
      description,
      tourStatus: tourStatus || "Draft",
      price: parseFloat(price),
      coverImage,
      author: authReq.user?._id,
      category: Array.isArray(category) ? category.map((catId: string) => {
        return {
          categoryId: new mongoose.Types.ObjectId(catId),
          categoryName: 'Category' // Default name, ideally you would fetch this from the database
        };
      }) : category ? [{
        categoryId: new mongoose.Types.ObjectId(category),
        categoryName: 'Category'
      }] : [],
      outline,
      itinerary: itinerary ? (
        (() => {
          try {
            const parsed = JSON.parse(itinerary);
            // Handle case where itinerary might have both array items and a days property
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed)) {
                // Map each item to ensure it has the required 'date' field
                return parsed.map((item: any) => ({
                  ...item,
                  date: item.dateTime || item.date || new Date() // Use dateTime if available, otherwise use date or fallback to current date
                }));
              } else if (parsed.days && Array.isArray(parsed.days)) {
                return parsed.days.map((item: any) => ({
                  ...item,
                  date: item.dateTime || item.date || new Date()
                }));
              } else {
                return [{
                  ...parsed,
                  date: parsed.dateTime || parsed.date || new Date()
                }];
              }
            }
            return [];
          } catch (error) {
            console.error("Error parsing itinerary:", error);
            console.error("Itinerary value:", itinerary);
            return [];
          }
        })()
      ) : [],
      dates: dates ? JSON.parse(dates) : undefined,
      include,
      exclude,
      facts: facts ? JSON.parse(facts) : [],
      faqs: faqs ? JSON.parse(faqs) : [],
      gallery: gallery ? JSON.parse(gallery) : [],
      map,
      location: location ? JSON.parse(location) : undefined,
      enquiry: enquiry === "true",
      isSpecialOffer: isSpecialOffer === "true",
      discount: discount ? JSON.parse(discount) : undefined,
      // New pricing structure fields
      basePrice,
      pricePerPerson,
      groupSize,
      saleEnabled,
      salePrice,
      pricingOptionsEnabled,
      pricingGroups,
      originalPrice
    });

    // Only add destination if it's a valid non-empty string
    if (destination && destination.trim() !== '') {
      newTour.destination = new mongoose.Types.ObjectId(destination);
    }

    // Handle discount data
    if (discount) {
      try {
        const discountData = JSON.parse(discount);
        
        // Create a new discount object that matches the schema
        newTour.discount = {
          percentage: parseFloat(discountData.percentage) || 0,
          startDate: new Date(discountData.startDate),
          endDate: new Date(discountData.endDate),
          isActive: discountData.isActive || false,
          description: discountData.description || '',
          discountCode: discountData.discountCode || '',
          maxDiscountAmount: parseFloat(discountData.maxDiscountAmount) || 0,
          minPurchaseAmount: parseFloat(discountData.minPurchaseAmount) || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } catch (error) {
        console.error("Error parsing discount data:", error);
        console.error("Discount value:", discount);
      }
    }

    // Save the tour
    const savedTour = await newTour.save();
    res.status(201).json({ tour: savedTour });
  } catch (err: any) {
    console.error("Failed to create tour:", err);
    next(createHttpError(500, `Failed to create tour: ${err.message}`));
  }
};

// Get all tours
export const getAllTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract pagination parameters from query
    const paginationParams: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: req.query.sortBy as string || 'updatedAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      search: req.query.search as string
    };


    // Build query to filter tours
    const query: any = {};
    
    // Filter by tour status if provided, otherwise default to 'published'
    // Use case-insensitive regex to match status regardless of case
    const tourStatus = req.query.tourStatus as string || 'Published';
    if (tourStatus) {
      query.tourStatus = { $regex: new RegExp(`^${tourStatus}$`, 'i') };
    }
    
    // Add any additional filters from query params
    if (req.query.category) {
      query['category.categoryId'] = req.query.category;
    }
    

    // Check what tour statuses exist in the database
    const distinctStatuses = await tourModel.distinct('tourStatus');
    
    // Count total tours with this status
    const totalToursWithStatus = await tourModel.countDocuments(query);

    // Use the paginate utility with the query to get filtered tours
    const result = await paginate(tourModel, query, paginationParams);
    // Populate author information for each tour
    if (result.items.length > 0) {
      await tourModel.populate(result.items, { path: 'author', select: 'name' });
    }


    // Return tours with pagination info
    res.status(200).json({
      tours: result.items,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalTours: result.totalItems,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1
      }
    });
  } catch (err) {
    console.error("Error in getAllTours:", err);
    next(createHttpError(500, 'Failed to get tours'));
  }
};

// Get user tours
export const getUserTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Base query
    let query = tourModel.find();

    // Apply role-based filtering
    if (authReq.roles !== 'admin') {
      query = query.find({ author: authReq.userId });
    }

    // Get total count for pagination
    const totalTours = await tourModel.countDocuments(
      authReq.roles === 'admin' ? {} : { author: authReq.userId }
    );

    // Apply pagination and populate
    const tours = await query
      .populate("author", "name email roles")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTours / limit),
          totalItems: totalTours,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error('Error in getUserTours:', err);
    next(createHttpError(500, 'Failed to get tours'));
  }
};

// Get a single tour
export const getTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tourId = req.params.tourId;
  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }

  try {
      const tour = await tourModel
          .findOne({ _id: tourId })
          // populate author field
          .populate('author', 'name email roles')
          .populate('reviews.user', 'name email roles');
          
      if (!tour) {
          return next(createHttpError(404, "tour not found."));
      }
      const breadcrumbs = [
        {
          label: tour.title, // Use tour title for breadcrumb label
          url: `/tours/${tour._id}`, // URL to the tour
        },
      ];
      
      res.status(200).json({ tour, breadcrumbs });
  } catch (err) {
      next(createHttpError(500, "Error while getting the tour."));
  }
};

// Update a tour
export const updateTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast req to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    const tourId = req.params.tourId; // Changed from req.params.id to req.params.tourId
    console.log("req.body ", tourId, userId, req.body);
    const {
      title,
      code,
      description,
      coverImage,
      tourStatus,
      price,
      originalPrice,
      // New pricing structure fields
      basePrice,
      pricePerPerson,
      groupSize,
      saleEnabled,
      salePrice,
      pricingOptionsEnabled,
      pricingGroups,
      category,
      outline,
      itinerary,
      dates,
      include,
      exclude,
      facts,
      faqs,
      gallery,
      map,
      location,
      discount,
      author,
      enquiry,
      isSpecialOffer,
      destination,
    } = req.body;

    // Parse and sanitize object inputs
    const updates: any = {
      title,
      code,
      description,
      tourStatus,
      price: price ? parseFloat(price) : undefined,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
    };
    
    // New pricing structure fields
    if (basePrice !== undefined) updates.basePrice = parseFloat(basePrice);
    if (pricePerPerson !== undefined) updates.pricePerPerson = pricePerPerson === true || pricePerPerson === "true";
    if (groupSize !== undefined) updates.groupSize = parseInt(groupSize as string);
    if (saleEnabled !== undefined) updates.saleEnabled = saleEnabled === true || saleEnabled === "true";
    if (salePrice !== undefined) updates.salePrice = parseFloat(salePrice as string);
    if (pricingOptionsEnabled !== undefined) updates.pricingOptionsEnabled = pricingOptionsEnabled === true || pricingOptionsEnabled === "true";
    
    // Handle complex objects that might be strings or already parsed objects
    if (pricingGroups) {
      updates.pricingGroups = typeof pricingGroups === 'string' ? JSON.parse(pricingGroups) : pricingGroups;
    }
    
    // Handle other complex objects
    if (outline) updates.outline = outline;
    if (include) updates.include = include;
    if (exclude) updates.exclude = exclude;
    if (enquiry !== undefined) updates.enquiry = enquiry === "true";
    if (isSpecialOffer !== undefined) updates.isSpecialOffer = isSpecialOffer === "true";
    
    // Handle cover image
    if (coverImage) updates.coverImage = coverImage;
    if (req.file?.path) updates.coverImage = req.file.path;
    
    // Handle category
    if (category) {
      try {
        // Handle the array of objects with label and value properties
        updates.category = Array.isArray(category) ? category.map((cat: any) => {
          if (cat && cat.value) {
            return {
              categoryId: new mongoose.Types.ObjectId(cat.value),
              categoryName: cat.label || 'Category'
            };
          }
          return null;
        }).filter(Boolean) : [];
      } catch (error) {
        console.error("Error processing category:", error);
        updates.category = [];
      }
    }
    
    // Handle itinerary
    if (itinerary) {
      try {
        // The itinerary is already in the correct format as an array of objects
        updates.itinerary = Array.isArray(itinerary) ? itinerary.map((item: any) => ({
          ...item,
          date: item.date || new Date() // Use date from the item or fallback to current date
        })) : [];
      } catch (error) {
        console.error("Error processing itinerary:", error);
        updates.itinerary = [];
      }
    }
    
    // Handle dates
    if (dates) {
      updates.dates = dates;
      // Ensure tripDuration is a number
      if (updates.dates.tripDuration) {
        updates.dates.tripDuration = parseInt(updates.dates.tripDuration);
      }
    }
    
    // Handle other JSON fields
    if (facts) {
      try {
        // Facts are already in the correct array format
        updates.facts = Array.isArray(facts) ? facts : [];
      } catch (error) {
        console.error("Error processing facts:", error);
        updates.facts = [];
      }
    }
    
    if (faqs) {
      try {
        // FAQs are already in the correct array format
        updates.faqs = Array.isArray(faqs) ? faqs : [];
      } catch (error) {
        console.error("Error processing faqs:", error);
        updates.faqs = [];
      }
    }
    
    if (gallery) {
      try {
        // Handle gallery array or single item
        updates.gallery = Array.isArray(gallery) ? gallery : [gallery];
      } catch (error) {
        console.error("Error processing gallery:", error);
        updates.gallery = [];
      }
    }
    
    if (location) {
      try {
        // Location is already in the correct object format
        updates.location = location;
      } catch (error) {
        console.error("Error processing location:", error);
        updates.location = {};
      }
    }
    
    if (map) updates.map = map;
    
    // Handle destination
    if (destination) {
      // Only add destination if it's a valid non-empty string
      if (typeof destination === 'string' && destination.trim() !== '') {
        updates.destination = new mongoose.Types.ObjectId(destination);
      } else if (destination._id) {
        updates.destination = new mongoose.Types.ObjectId(destination._id);
      }
    }
    
    // Handle discount data
    if (discount) {
      const discountData = typeof discount === 'string' ? JSON.parse(discount) : discount;
      // Update the discount object to match the schema
      updates.discount = {
        percentage: parseFloat(discountData.percentage) || 0,
        startDate: new Date(discountData.startDate),
        endDate: new Date(discountData.endDate),
        isActive: discountData.isActive || false,
        description: discountData.description || '',
        discountCode: discountData.discountCode || '',
        maxDiscountAmount: parseFloat(discountData.maxDiscountAmount) || 0,
        minPurchaseAmount: parseFloat(discountData.minPurchaseAmount) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Find the tour
    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, "Tour not found"));
    }

    // Check if the user is the author or an admin
    if (
      authReq.user?.roles !== "admin" &&
      tour.author.toString() !== authReq.user?._id.toString()
    ) {
      return next(
        createHttpError(403, "You are not authorized to update this tour")
      );
    }

    // Update the tour fields with all our processed updates
    Object.assign(tour, updates);

    // Save the updated tour
    const updatedTour = await tour.save();
    res.status(200).json({ tour: updatedTour });
  } catch (err: any) {
    console.error(err);
    next(createHttpError(500, "Failed to update tour"));
  }
};

// Delete a tour
export const deleteTour = async (req: Request, res: Response, next: NextFunction) => {
  const tourId = req.params.tourId;

  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }

  try {
    const tour = await tourModel.findByIdAndDelete(tourId);

    if (!tour) {
      return next(createHttpError(404, "Tour not found."));
    }

    res.status(200).json({ message: "Tour deleted successfully" });
  } catch (err: any) {
    console.log(err);
    next(createHttpError(500, "Error while deleting the tour."));
  }
};

// Get latest created tours
export const getLatestTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({ tourStatus: 'Published' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("author", "name roles");
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get latest tours'));
  }
};

// Get tours by rating
export const getToursByRating = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({ tourStatus: 'Published', reviewCount: { $gt: 0 } })
      .sort({ averageRating: -1 })
      .limit(10)
      .populate("author", "name roles");
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get top-rated tours'));
  }
};

// Get discounted tours
export const getDiscountedTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentDate = new Date();
    const { 
      limit = 10, 
      page = 1, 
      minDiscount = 0, 
      maxDiscount = 100,
      sortBy = 'percentage', // percentage, price, date
      sortOrder = 'desc' 
    } = req.query;
    
    // Convert query parameters to appropriate types
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const minDiscountNum = parseInt(minDiscount as string);
    const maxDiscountNum = parseInt(maxDiscount as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Build sort options
    const sortOptions: any = {};
    if (sortBy === 'percentage') {
      sortOptions['discount.percentage'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'price') {
      sortOptions['price'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'date') {
      sortOptions['updatedAt'] = sortOrder === 'asc' ? 1 : -1;
    }
    
    // Build query
    const query = {
      tourStatus: 'Published',
      'discount.isActive': true,
      'discount.startDate': { $lte: currentDate },
      'discount.endDate': { $gte: currentDate },
      'discount.percentage': { 
        $gte: minDiscountNum, 
        $lte: maxDiscountNum 
      }
    };
    
    // Get total count for pagination
    const totalCount = await tourModel.countDocuments(query);
    
    // Get tours with pagination
    const tours = await tourModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate("author", "name roles")
      .populate("category.categoryId", "name");
    
    // Calculate discounted prices for each tour
    const toursWithDiscountInfo = tours.map(tour => {
      const tourObject = tour.toJSON();
      return tourObject;
    });
    
    res.status(200).json({ 
      tours: toursWithDiscountInfo,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    next(createHttpError(500, 'Failed to get discounted tours'));
  }
};

// Get special offer tours
export const getSpecialOfferTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({
      tourStatus: 'Published',
      isSpecialOffer: true
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("author", "name roles");
    
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get special offer tours'));
  }
};

// Search for tours
export const searchTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { keyword, destination, minPrice, maxPrice, rating } = req.query;
    
    // Build query
    const query: any = { tourStatus: 'Published' };
    
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { outline: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    if (destination) {
      query.destination = destination;
    }
    
    if (minPrice) {
      query.price = { $gte: parseFloat(minPrice as string) };
    }
    
    if (maxPrice) {
      if (query.price) {
        query.price.$lte = parseFloat(maxPrice as string);
      } else {
        query.price = { $lte: parseFloat(maxPrice as string) };
      }
    }
    
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating as string) };
    }
    
    const tours = await tourModel.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "name roles");
      
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to search tours'));
  }
};

// Add a review to a tour
export const addReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;
    const { rating, comment } = req.body;
    const _req = req as AuthRequest;

    // Ensure user is authenticated
    if (!_req.userId) {
      return next(createHttpError(401, 'You must be logged in to add a review'));
    }

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Validate rating (now allowing 0.5 increments)
    if (!rating || rating < 0.5 || rating > 5) {
      return next(createHttpError(400, 'Rating must be between 0.5 and 5'));
    }

    // Round rating to nearest 0.5
    const roundedRating = Math.round(rating * 2) / 2;

    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Check if user has already reviewed this tour
    const existingReviewIndex = tour.reviews.findIndex(
      (review: any) => review.user.toString() === _req.userId
    );

    if (existingReviewIndex !== -1) {
      // Update existing review
      tour.reviews[existingReviewIndex].rating = roundedRating;
      tour.reviews[existingReviewIndex].comment = comment;
      tour.reviews[existingReviewIndex].status = 'pending'; // Reset to pending when updated
      tour.reviews[existingReviewIndex].createdAt = new Date();
    } else {
      // Add new review
      tour.reviews.push({
        user: new mongoose.Types.ObjectId(_req.userId),
        rating: roundedRating,
        comment,
        status: 'pending', // All new reviews start as pending
        likes: 0,
        views: 0,
        replies: [],
        createdAt: new Date()
      });
    }

    // Save the tour - the pre-save hook will handle recalculating ratings
    await tour.save();

    // Increment the view counter for the tour
    await tourModel.findByIdAndUpdate(tourId, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      message: existingReviewIndex !== -1 ? 'Review updated successfully' : 'Review added successfully. It will be visible after approval.',
      data: {
        review: existingReviewIndex !== -1 ? tour.reviews[existingReviewIndex] : tour.reviews[tour.reviews.length - 1],
        averageRating: tour.averageRating,
        reviewCount: tour.reviewCount,
        approvedReviewCount: tour.approvedReviewCount || 0
      }
    });
  } catch (err: any) {
    console.error('Error in addReview:', err);
    next(createHttpError(500, 'Failed to add review'));
  }
};

// Get reviews for a tour
export const getTourReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string || 'all'; // Default to showing all reviews instead of just approved

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    const tour = await tourModel.findById(tourId)
      .populate({
        path: 'reviews.user',
        select: 'name email profileImage roles'
      })
      .populate({
        path: 'reviews.replies.user',
        select: 'name email profileImage roles'
      });

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Filter reviews by status if specified
    let filteredReviews = tour.reviews;
    if (status !== 'all') {
      filteredReviews = tour.reviews.filter((review: any) => review.status === status);
    }

    // Sort reviews by date (newest first) and apply pagination
    const sortedReviews = filteredReviews.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedReviews = sortedReviews.slice(skip, skip + limit);

    // Increment view counter for each review being viewed
    for (const review of paginatedReviews) {
      await tourModel.updateOne(
        { _id: tourId, "reviews._id": review._id },
        { $inc: { "reviews.$.views": 1 } }
      );
    }


    console.log("paginated reveiw ", paginatedReviews )
    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredReviews.length / limit),
          totalItems: filteredReviews.length,
          itemsPerPage: limit
        },
        averageRating: tour.averageRating,
        reviewCount: tour.reviewCount,
        approvedReviewCount: tour.approvedReviewCount || 0
      }
    });
  } catch (err: any) {
    console.error('Error in getTourReviews:', err);
    next(createHttpError(500, 'Failed to get reviews'));
  }
};

// Get pending reviews for a seller's tours
export const getPendingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const sellerId = _req.userId;
    
    // Ensure user is authenticated
    if (!sellerId) {
      return next(createHttpError(401, 'You must be logged in to view pending reviews'));
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find all tours by this seller that have pending reviews
    const tours = await tourModel.find({ 
      author: sellerId,
      'reviews.status': 'pending'
    }).populate({
      path: 'reviews.user',
      select: 'name email profileImage roles'
    });

    if (!tours || tours.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending reviews found',
        data: {
          reviews: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit
          }
        }
      });
    }

    // Extract all pending reviews from all tours
    const pendingReviews = tours.flatMap(tour => {
      const tourReviews = tour.reviews.filter((review: any) => review.status === 'pending');
      return tourReviews.map((review: any) => ({
        ...review.toObject(),
        tourId: tour._id,
        tourTitle: tour.title
      }));
    });

    // Sort reviews by date (newest first) and apply pagination
    const sortedReviews = pendingReviews.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedReviews = sortedReviews.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(pendingReviews.length / limit),
          totalItems: pendingReviews.length,
          itemsPerPage: limit
        }
      }
    });
  } catch (err: any) {
    console.error('Error in getPendingReviews:', err);
    next(createHttpError(500, 'Failed to get pending reviews'));
  }
};

// Get all reviews for a seller (regardless of status)
export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req.userId;
    
    // Ensure user is authenticated
    if (!userId) {
      return next(createHttpError(401, 'You must be logged in to view reviews'));
    }
    
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50; // Increased limit to show more reviews
    const skip = (page - 1) * limit;

    // First, check if the user is an admin
    const user = await userModel.findById(userId);
    const isAdmin = user?.roles === 'admin';
    

    let tours;
    if (isAdmin) {
      // Admins can see all tours with reviews
      tours = await tourModel.find({}).populate({
        path: 'reviews.user',
        select: 'name email profileImage roles'
      }).populate({
        path: 'reviews.replies.user',
        select: 'name email profileImage roles'
      });
    } else {
      // Regular sellers can only see their own tours with reviews
      tours = await tourModel.find({ 
        author: userId
      }).populate({
        path: 'reviews.user',
        select: 'name email profileImage roles'
      }).populate({
        path: 'reviews.replies.user',
        select: 'name email profileImage roles'
      });
    }


    if (!tours || tours.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No reviews found',
        data: {
          reviews: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit
          }
        }
      });
    }

    // Extract all reviews from all tours
    const allReviews = [];
    
    // Loop through each tour and extract its reviews
    for (const tour of tours) {
      
      if (tour.reviews && tour.reviews.length > 0) {
        // Log each review for debugging
       
        
        // Map each review to include the tour information
        const tourReviews = tour.reviews.map((review: any) => {
          const reviewObj = review.toObject ? review.toObject() : review;
          return {
            ...reviewObj,
            tourId: tour._id,
            tourTitle: tour.title
          };
        });
        
        // Add these reviews to our collection
        allReviews.push(...tourReviews);
      }
    }
    
    
    // Sort reviews by date (newest first) and apply pagination
    const sortedReviews = allReviews.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedReviews = sortedReviews.slice(skip, skip + limit);
    console.log('Returning paginated reviews:', paginatedReviews.length);

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(allReviews.length / limit),
          totalItems: allReviews.length,
          itemsPerPage: limit
        }
      }
    });
  } catch (err: any) {
    console.error('Error in getAllReviews:', err);
    next(createHttpError(500, 'Failed to get reviews'));
  }
};

// Approve or reject a review
export const updateReviewStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId, reviewId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const _req = req as AuthRequest;
    const sellerId = _req.userId;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, 'Invalid tour or review ID'));
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return next(createHttpError(400, 'Status must be either "approved" or "rejected"'));
    }

    // Find the tour and ensure it belongs to the current user
    const tour = await tourModel.findOne({ 
      _id: tourId,
      author: sellerId
    });

    if (!tour) {
      return next(createHttpError(404, 'Tour not found or you are not authorized to manage this tour'));
    }

    // Find the review
    const reviewIndex = tour.reviews.findIndex(
      (review: any) => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return next(createHttpError(404, 'Review not found'));
    }

    // Update the review status
    tour.reviews[reviewIndex].status = status;

    // Save the tour - the pre-save hook will handle recalculating ratings
    await tour.save();

    res.status(200).json({
      success: true,
      message: `Review ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: {
        review: tour.reviews[reviewIndex],
        averageRating: tour.averageRating,
        reviewCount: tour.reviewCount,
        approvedReviewCount: tour.approvedReviewCount || 0
      }
    });
  } catch (err: any) {
    console.error('Error in updateReviewStatus:', err);
    next(createHttpError(500, `Failed to ${req.body.status} review`));
  }
};

// Add a reply to a review
export const addReviewReply = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId, reviewId } = req.params;
    const { comment } = req.body;
    const _req = req as AuthRequest;
    
    // Ensure user is authenticated
    if (!_req.userId) {
      return next(createHttpError(401, 'You must be logged in to reply to a review'));
    }

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, 'Invalid tour or review ID'));
    }

    if (!comment || comment.trim() === '') {
      return next(createHttpError(400, 'Reply comment is required'));
    }

    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Find the review
    const reviewIndex = tour.reviews.findIndex(
      (review: any) => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return next(createHttpError(404, 'Review not found'));
    }

    // Add the reply
    const newReply = {
      user: new mongoose.Types.ObjectId(_req.userId),
      comment,
      createdAt: new Date(),
      likes: 0,
      views: 0
    };

    tour.reviews[reviewIndex].replies.push(newReply);

    // Save the tour
    await tour.save();

    // Populate the user data for the new reply
    const populatedTour = await tourModel.findById(tourId)
      .populate({
        path: 'reviews.replies.user',
        select: 'name email profileImage roles'
      });

    const updatedReview = populatedTour?.reviews[reviewIndex];
    const newReplyWithUser = updatedReview?.replies[updatedReview.replies.length - 1];

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: {
        reply: newReplyWithUser
      }
    });
  } catch (err: any) {
    console.error('Error in addReviewReply:', err);
    next(createHttpError(500, 'Failed to add reply'));
  }
};

// Like a review
export const likeReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId, reviewId } = req.params;
    const _req = req as AuthRequest;
    
    // Ensure user is authenticated
    if (!_req.userId) {
      return next(createHttpError(401, 'You must be logged in to like a review'));
    }

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return next(createHttpError(400, 'Invalid tour or review ID'));
    }

    // Update the review's likes count
    const result = await tourModel.updateOne(
      { _id: tourId, "reviews._id": reviewId },
      { $inc: { "reviews.$.likes": 1 } }
    );

    if (result.matchedCount === 0) {
      return next(createHttpError(404, 'Tour or review not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Review liked successfully'
    });
  } catch (err: any) {
    console.error('Error in likeReview:', err);
    next(createHttpError(500, 'Failed to like review'));
  }
};

// Like a review reply
export const likeReviewReply = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId, reviewId, replyId } = req.params;
    const _req = req as AuthRequest;
    
    // Ensure user is authenticated
    if (!_req.userId) {
      return next(createHttpError(401, 'You must be logged in to like a reply'));
    }

    if (!mongoose.Types.ObjectId.isValid(tourId) || 
        !mongoose.Types.ObjectId.isValid(reviewId) ||
        !mongoose.Types.ObjectId.isValid(replyId)) {
      return next(createHttpError(400, 'Invalid IDs provided'));
    }

    // Find the tour
    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Find the review
    const reviewIndex = tour.reviews.findIndex(
      (review: any) => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return next(createHttpError(404, 'Review not found'));
    }

    // Find the reply
    const replyIndex = tour.reviews[reviewIndex].replies.findIndex(
      (reply: any) => reply._id.toString() === replyId
    );

    if (replyIndex === -1) {
      return next(createHttpError(404, 'Reply not found'));
    }

    // Increment the likes count
    tour.reviews[reviewIndex].replies[replyIndex].likes += 1;

    // Save the tour
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Reply liked successfully'
    });
  } catch (err: any) {
    console.error('Error in likeReviewReply:', err);
    next(createHttpError(500, 'Failed to like reply'));
  }
};

// Increment tour view count
export const incrementTourViews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Increment the view counter
    const result = await tourModel.findByIdAndUpdate(
      tourId, 
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!result) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Tour view count incremented',
      data: {
        views: result.views
      }
    });
  } catch (err: any) {
    console.error('Error in incrementTourViews:', err);
    next(createHttpError(500, 'Failed to increment view count'));
  }
};

// Increment tour booking count
export const incrementTourBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Increment the booking counter
    const result = await tourModel.findByIdAndUpdate(
      tourId, 
      { $inc: { bookingCount: 1 } },
      { new: true }
    );

    if (!result) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Tour booking count incremented',
      data: {
        bookingCount: result.bookingCount
      }
    });
  } catch (err: any) {
    console.error('Error in incrementTourBookings:', err);
    next(createHttpError(500, 'Failed to increment booking count'));
  }
};
