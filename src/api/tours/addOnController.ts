import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tour from './tourModel';
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import { AddOn } from './tourTypes';

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

// Get all add-ons for a specific tour
export const getAddOns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const authReq = req as AuthRequest;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // For public API endpoints where authentication is optional
    const isSeller = authReq.roles === 'seller';
    const userId = authReq.userId;
    
    // If authenticated as seller, check authorization
    if (isSeller && userId) {
      const isAuthorized = await isAuthorizedForTour(userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view add-ons for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      data: tour.addOns || []
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific add-on by ID
export const getAddOnById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, addOnId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(addOnId)) {
      return next(createHttpError(400, 'Invalid tour ID or add-on ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view this add-on'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    const addOn = tour.addOns?.find(
      (addon: any) => addon._id.toString() === addOnId
    );

    if (!addOn) {
      return next(createHttpError(404, 'Add-on not found'));
    }

    res.status(200).json({
      success: true,
      data: addOn
    });
  } catch (error) {
    next(error);
  }
};

// Create a new add-on for a tour
export const createAddOn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const addOnData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to add add-ons to this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Validate category
    if (addOnData.category === 'other' && !addOnData.customCategory) {
      return next(createHttpError(400, 'Custom category is required when category is "other"'));
    }

    // Add add-on to tour
    if (!tour.addOns) {
      tour.addOns = [];
    }
    
    tour.addOns.push(addOnData);
    await tour.save();

    const newAddOn = tour.addOns[tour.addOns.length - 1];

    res.status(201).json({
      success: true,
      data: newAddOn
    });
  } catch (error) {
    next(error);
  }
};

// Update an add-on
export const updateAddOn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, addOnId } = req.params;
    const updateData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(addOnId)) {
      return next(createHttpError(400, 'Invalid tour ID or add-on ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to update add-ons for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    const addOn = tour.addOns?.find(
      (addon: any) => addon._id.toString() === addOnId
    );

    if (!addOn) {
      return next(createHttpError(404, 'Add-on not found'));
    }

    // Validate category if it's being updated
    if (updateData.category === 'other' && !updateData.customCategory && !addOn.customCategory) {
      return next(createHttpError(400, 'Custom category is required when category is "other"'));
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      // Skip updating the _id field
      if (key !== '_id') {
        (addOn as any)[key] = updateData[key];
      }
    });

    await tour.save();

    res.status(200).json({
      success: true,
      data: addOn
    });
  } catch (error) {
    next(error);
  }
};

// Delete an add-on
export const deleteAddOn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, addOnId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(addOnId)) {
      return next(createHttpError(400, 'Invalid tour ID or add-on ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to delete add-ons for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    if (!tour.addOns) {
      return next(createHttpError(404, 'No add-ons found for this tour'));
    }

    const addOnIndex = tour.addOns.findIndex(
      (addon: any) => addon._id.toString() === addOnId
    );

    if (addOnIndex === -1) {
      return next(createHttpError(404, 'Add-on not found'));
    }

    // Remove the add-on
    tour.addOns.splice(addOnIndex, 1);
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Add-on successfully deleted'
    });
  } catch (error) {
    next(error);
  }
};
