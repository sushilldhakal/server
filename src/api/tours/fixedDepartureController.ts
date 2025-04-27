import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tour from './tourModel';
import createHttpError from 'http-errors';
import { FixedDeparture } from './tourTypes';
import { AuthRequest } from '../../middlewares/authenticate';

// Helper function to check if user is authorized for a tour
const isAuthorizedForTour = async (userId: string, userRole: string, tourId: string): Promise<boolean> => {
  // Admins can access all tours
  if (userRole === 'admin') {
    return true;
  }
  
  // Sellers can only access their own tours
  if (userRole === 'seller') {
    const tour = await Tour.findById(tourId);
    if (!tour) return false;
    
    // Check if user is the author of the tour
    // Handle both array of ObjectIds and single ObjectId
    if (Array.isArray(tour.author)) {
      return tour.author.some((authorId: any) => 
        authorId.toString() === userId
      );
    } else if (tour.author) {
      // Handle single author case
      return tour.author.toString() === userId;
    }
    
    return false;
  }
  
  // Regular users cannot access management features
  return false;
};

// Get all fixed departures for a specific tour
export const getFixedDepartures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const authReq = req as AuthRequest;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // For public API endpoints where authentication is optional
    const isSeller = authReq.roles === 'seller';
    const isAdmin = authReq.roles === 'admin';
    const userId = authReq.userId;
    
    // If authenticated as seller, check authorization
    if (isSeller && userId) {
      const isAuthorized = await isAuthorizedForTour(userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view this tour\'s departures'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      data: tour.fixedDepartures || []
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific fixed departure by ID
export const getFixedDepartureById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, departureId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(departureId)) {
      return next(createHttpError(400, 'Invalid tour ID or departure ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view this departure'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Use array find method instead of id() which TypeScript doesn't recognize
    const departure = tour.fixedDepartures?.find(
      (dep: any) => dep._id.toString() === departureId
    );

    if (!departure) {
      return next(createHttpError(404, 'Fixed departure not found'));
    }

    res.status(200).json({
      success: true,
      data: departure
    });
  } catch (error) {
    next(error);
  }
};

// Create a new fixed departure for a tour
export const createFixedDeparture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const departureData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to add departures to this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Add tourId to departure data
    departureData.tourId = tourId;

    // Validate dates
    if (new Date(departureData.startDate) > new Date(departureData.endDate)) {
      return next(createHttpError(400, 'Start date must be before end date'));
    }

    // Add departure to tour
    tour.fixedDepartures.push(departureData);
    await tour.save();

    const newDeparture = tour.fixedDepartures[tour.fixedDepartures.length - 1];

    res.status(201).json({
      success: true,
      data: newDeparture
    });
  } catch (error) {
    next(error);
  }
};

// Update a fixed departure
export const updateFixedDeparture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, departureId } = req.params;
    const updateData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(departureId)) {
      return next(createHttpError(400, 'Invalid tour ID or departure ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to update departures for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Use array find method instead of id()
    const departure = tour.fixedDepartures?.find(
      (dep: any) => dep._id.toString() === departureId
    );

    if (!departure) {
      return next(createHttpError(404, 'Fixed departure not found'));
    }

    // Validate dates if they're being updated
    if (
      updateData.startDate && 
      updateData.endDate && 
      new Date(updateData.startDate) > new Date(updateData.endDate)
    ) {
      return next(createHttpError(400, 'Start date must be before end date'));
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      // Skip updating the _id field
      if (key !== '_id' && key !== 'tourId') {
        (departure as any)[key] = updateData[key];
      }
    });

    await tour.save();

    res.status(200).json({
      success: true,
      data: departure
    });
  } catch (error) {
    next(error);
  }
};

// Cancel/force-cancel a departure
export const cancelFixedDeparture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, departureId } = req.params;
    const { isForceCanceled, forceCancelReason } = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(departureId)) {
      return next(createHttpError(400, 'Invalid tour ID or departure ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to cancel departures for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Use array find method instead of id()
    const departure = tour.fixedDepartures?.find(
      (dep: any) => dep._id.toString() === departureId
    );

    if (!departure) {
      return next(createHttpError(404, 'Fixed departure not found'));
    }

    // If force cancelling, a reason is required
    if (isForceCanceled && !forceCancelReason) {
      return next(createHttpError(400, 'Reason is required when force cancelling a departure'));
    }

    // Update cancellation status
    departure.isForceCanceled = isForceCanceled || false;
    departure.forceCancelReason = forceCancelReason || '';
    departure.status = 'canceled';

    await tour.save();

    res.status(200).json({
      success: true,
      data: departure
    });
  } catch (error) {
    next(error);
  }
};

// Add notification to users for a fixed departure
export const addNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, departureId } = req.params;
    const { userId, notificationType } = req.body;
    const authReq = req as AuthRequest;

    if (
      !mongoose.Types.ObjectId.isValid(tourId) || 
      !mongoose.Types.ObjectId.isValid(departureId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return next(createHttpError(400, 'Invalid tour, departure, or user ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to send notifications for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Use array find method instead of id()
    const departure = tour.fixedDepartures?.find(
      (dep: any) => dep._id.toString() === departureId
    );

    if (!departure) {
      return next(createHttpError(404, 'Fixed departure not found'));
    }

    // Add notification
    departure.notifiedUsers.push({
      userId,
      notificationType,
      notifiedAt: new Date(),
      isRead: false
    });

    await tour.save();

    res.status(200).json({
      success: true,
      data: departure.notifiedUsers[departure.notifiedUsers.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// Delete a fixed departure
export const deleteFixedDeparture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, departureId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(departureId)) {
      return next(createHttpError(400, 'Invalid tour ID or departure ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to delete departures for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Check if the departure exists
    const departureIndex = tour.fixedDepartures.findIndex(
      (dep: any) => dep._id.toString() === departureId
    );

    if (departureIndex === -1) {
      return next(createHttpError(404, 'Fixed departure not found'));
    }

    // Remove the departure
    tour.fixedDepartures.splice(departureIndex, 1);
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Fixed departure successfully deleted'
    });
  } catch (error) {
    next(error);
  }
};

// Get active fixed departures (scheduled and not canceled) for all tours
export const getActiveFixedDepartures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    let query: any = {
      'fixedDepartures.status': { $in: ['scheduled', 'in_progress'] },
      'fixedDepartures.isForceCanceled': false,
      'fixedDepartures.isActive': true
    };
    
    // For sellers, only show their own tours
    if (authReq.roles === 'seller') {
      query.author = { $in: [new mongoose.Types.ObjectId(authReq.userId)] };
    }

    const tours = await Tour.find(query).select('title fixedDepartures author');

    // Flatten the structure to just get the fixed departures with tour info
    const activeDepartures = tours.flatMap(tour => {
      return tour.fixedDepartures
        .filter((dep: any) => 
          (dep.status === 'scheduled' || dep.status === 'in_progress') && 
          !dep.isForceCanceled && 
          dep.isActive
        )
        .map((dep: any) => ({
          ...dep.toJSON(), // Use toJSON instead of toObject which is more reliable in TypeScript
          tourTitle: tour.title,
          tourId: tour._id
        }));
    });

    res.status(200).json({
      success: true,
      count: activeDepartures.length,
      data: activeDepartures
    });
  } catch (error) {
    next(error);
  }
};
