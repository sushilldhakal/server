import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Tour from './tourModel';
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import { PromoCode } from './tourTypes';

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

// Get all promo codes (admin only)
export const getAllPromoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    
    // Only admins can see all promo codes
    if (authReq.roles !== 'admin') {
      return next(createHttpError(403, 'Only administrators can view all promo codes'));
    }

    // Find all tours with promo codes
    const tours = await Tour.find({ 'promoCodes.0': { $exists: true } })
      .select('title promoCodes');

    // Flatten the structure to get all promo codes with tour info
    const promoCodes = tours.flatMap(tour => {
      return (tour.promoCodes || []).map((code: any) => ({
        ...code.toJSON(),
        tourTitle: tour.title,
        tourId: tour._id
      }));
    });

    res.status(200).json({
      success: true,
      count: promoCodes.length,
      data: promoCodes
    });
  } catch (error) {
    next(error);
  }
};

// Get promo codes for a specific tour
export const getTourPromoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const authReq = req as AuthRequest;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view promo codes for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      data: tour.promoCodes || []
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific promo code by ID
export const getPromoCodeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, promoCodeId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(promoCodeId)) {
      return next(createHttpError(400, 'Invalid tour ID or promo code ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to view this promo code'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    const promoCode = tour.promoCodes?.find(
      (code: any) => code._id.toString() === promoCodeId
    );

    if (!promoCode) {
      return next(createHttpError(404, 'Promo code not found'));
    }

    res.status(200).json({
      success: true,
      data: promoCode
    });
  } catch (error) {
    next(error);
  }
};

// Validate a promo code (public endpoint)
export const validatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, tourId } = req.body;
    
    if (!code) {
      return next(createHttpError(400, 'Promo code is required'));
    }
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Find the promo code (case insensitive)
    const promoCode = tour.promoCodes?.find(
      (pc: any) => pc.code.toLowerCase() === code.toLowerCase() && pc.isActive
    );

    if (!promoCode) {
      return next(createHttpError(404, 'Invalid or expired promo code'));
    }

    // Check if the promo code is valid (active, within date range, and not maxed out)
    const now = new Date();
    if (now < promoCode.startDate || now > promoCode.endDate) {
      return next(createHttpError(400, 'Promo code is not valid at this time'));
    }

    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return next(createHttpError(400, 'Promo code has reached maximum usage limit'));
    }

    // Return the promo code details (without incrementing usage count)
    res.status(200).json({
      success: true,
      data: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        maxDiscountAmount: promoCode.maxDiscountAmount,
        minPurchaseAmount: promoCode.minPurchaseAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new promo code
export const createPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId } = req.params;
    const promoCodeData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to add promo codes to this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    // Check if code already exists (case insensitive)
    if (tour.promoCodes && tour.promoCodes.some(
      (pc: any) => pc.code.toLowerCase() === promoCodeData.code.toLowerCase()
    )) {
      return next(createHttpError(400, 'A promo code with this code already exists'));
    }

    // Validate dates
    if (new Date(promoCodeData.startDate) > new Date(promoCodeData.endDate)) {
      return next(createHttpError(400, 'Start date must be before end date'));
    }

    // Add creator information
    promoCodeData.createdBy = authReq.userId;
    promoCodeData.currentUses = 0;

    // Add promo code to tour
    if (!tour.promoCodes) {
      tour.promoCodes = [];
    }
    
    tour.promoCodes.push(promoCodeData);
    await tour.save();

    const newPromoCode = tour.promoCodes[tour.promoCodes.length - 1];

    res.status(201).json({
      success: true,
      data: newPromoCode
    });
  } catch (error) {
    next(error);
  }
};

// Update a promo code
export const updatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, promoCodeId } = req.params;
    const updateData = req.body;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(promoCodeId)) {
      return next(createHttpError(400, 'Invalid tour ID or promo code ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to update promo codes for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    const promoCode = tour.promoCodes?.find(
      (code: any) => code._id.toString() === promoCodeId
    );

    if (!promoCode) {
      return next(createHttpError(404, 'Promo code not found'));
    }

    // Check if code is being changed and if it would conflict
    if (updateData.code && updateData.code.toLowerCase() !== promoCode.code.toLowerCase() &&
        tour.promoCodes?.some((pc: any) => 
          pc._id.toString() !== promoCodeId && 
          pc.code.toLowerCase() === updateData.code.toLowerCase()
        )) {
      return next(createHttpError(400, 'A promo code with this code already exists'));
    }

    // Validate dates if they're being updated
    if (updateData.startDate && updateData.endDate && 
        new Date(updateData.startDate) > new Date(updateData.endDate)) {
      return next(createHttpError(400, 'Start date must be before end date'));
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      // Skip updating the _id field and createdBy field
      if (key !== '_id' && key !== 'createdBy') {
        (promoCode as any)[key] = updateData[key];
      }
    });

    await tour.save();

    res.status(200).json({
      success: true,
      data: promoCode
    });
  } catch (error) {
    next(error);
  }
};

// Delete a promo code
export const deletePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, promoCodeId } = req.params;
    const authReq = req as AuthRequest;

    if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(promoCodeId)) {
      return next(createHttpError(400, 'Invalid tour ID or promo code ID'));
    }

    // Check authorization for sellers
    if (authReq.roles === 'seller') {
      const isAuthorized = await isAuthorizedForTour(authReq.userId, 'seller', tourId);
      if (!isAuthorized) {
        return next(createHttpError(403, 'You are not authorized to delete promo codes for this tour'));
      }
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(createHttpError(404, 'Tour not found'));
    }

    if (!tour.promoCodes) {
      return next(createHttpError(404, 'No promo codes found for this tour'));
    }

    const promoCodeIndex = tour.promoCodes.findIndex(
      (code: any) => code._id.toString() === promoCodeId
    );

    if (promoCodeIndex === -1) {
      return next(createHttpError(404, 'Promo code not found'));
    }

    // Remove the promo code
    tour.promoCodes.splice(promoCodeIndex, 1);
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Promo code successfully deleted'
    });
  } catch (error) {
    next(error);
  }
};
