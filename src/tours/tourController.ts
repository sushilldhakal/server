import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';

// Get all tours
export const getAllTours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tours = await tourModel.find();
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    next(createHttpError(500, 'Failed to get tours'));
  }
};

// Get a single tour
export const getTour = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await tourModel.findById(req.params.id);
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    next(createHttpError(500, 'Failed to get tour'));
  }
};

// Create a new tour
export const createTour = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newTour = await tourModel.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
        // Handle validation errors
        const errors = Object.values(err.errors).map((el: any) => el.message);
        return next(createHttpError(400, `Validation Error: ${errors.join('. ')}`));
      }
      // Handle other errors
      next(createHttpError(500, 'Failed to create tour'));
    }
};

// Update a tour
export const updateTour = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await tourModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    next(createHttpError(500, 'Failed to update tour'));
  }
};

// Delete a tour
export const deleteTour = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tour = await tourModel.findByIdAndDelete(req.params.id);
    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(createHttpError(500, 'Failed to delete tour'));
  }
};


// Get latest created tours
export const getLatestTours = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tours = await tourModel.find()
        .sort({ createdAt: -1 }) // Sort by createdAt field in descending order (newest first)
        .limit(10); // Limit to 10 latest tours, adjust as needed
  
      res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
          tours,
        },
      });
    } catch (err) {
      console.error('Get Latest Tours Error:', err);
      next(createHttpError(500, 'Failed to fetch latest tours'));
    }
  };


  // Get tours with higher ratings
export const getToursByRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tours = await tourModel.find()
        .sort({ rating: -1 }) // Sort by rating field in descending order (highest rating first)
        .limit(10); // Limit to 10 tours with highest ratings, adjust as needed
  
      res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
          tours,
        },
      });
    } catch (err) {
      console.error('Get Tours by Rating Error:', err);
      next(createHttpError(500, 'Failed to fetch tours by rating'));
    }
  };


  // Get tours with discount
export const getDiscountedTours = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tours = await tourModel.find({ discountPrice: { $exists: true, $ne: null } });
  
      res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
          tours,
        },
      });
    } catch (err) {
      console.error('Get Discounted Tours Error:', err);
      next(createHttpError(500, 'Failed to fetch discounted tours'));
    }
  };

// Search for tours
export const searchTours = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let query: any = {};
  
      // Handle search by name
      if (req.query.name) {

        query.name = { $regex: req.query.name as string, $options: 'i' };
      }
  
      // Handle search by destinations
      if (req.query.destinations) {
        query['locations.city'] = { $in: (req.query.destinations as string).split(',') };
      }
  
      // Handle search by tour type
      if (req.query.type) {
        query.type = req.query.type as string;
      }
  
      // Handle search by trip duration range
      if (req.query.minDuration || req.query.maxDuration) {
        query.duration = {};
        if (req.query.minDuration) {
          query.duration.$gte = parseInt(req.query.minDuration as string, 10);
        }
        if (req.query.maxDuration) {
          query.duration.$lte = parseInt(req.query.maxDuration as string, 10);
        }
      }
  
      // Handle search by start and end date range
      if (req.query.startDate || req.query.endDate) {
        query['dates.date'] = {};
        if (req.query.startDate) {
          query['dates.date'].$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          query['dates.date'].$lte = new Date(req.query.endDate as string);
        }
      }
  
      // Handle search by min and max price range
      if (req.query.minPrice || req.query.maxPrice) {
        query['dates.price'] = {};
        if (req.query.minPrice) {
          query['dates.price'].$gte = parseInt(req.query.minPrice as string, 10);
        }
        if (req.query.maxPrice) {
          query['dates.price'].$lte = parseInt(req.query.maxPrice as string, 10);
        }
      }
  
      // Execute the query
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