import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import destinationModel from './destinationModel';
import { AuthRequest } from "../../middlewares/authenticate";
import mongoose from 'mongoose';
import tourModel from '../tours/tourModel';

// Get all destinations
export const getAllDestinations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {
    const destinations = await destinationModel.find();
    res.status(200).json({ destinations });
  } catch (err) {
    next(createHttpError(500, 'Failed to get destinations'));
  }
};

export const getUserDestinations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const userRole = req.roles; // Assuming role is available in the request
  try {
    const destinations = userRole === 'admin' 
      ? await destinationModel.find()
      : await destinationModel.find({ userId });
      
    res.status(200).json({ destinations });
  } catch (err) {
    next(createHttpError(500, 'Failed to get user destinations'));
  }
};

// Get a single destination
export const getDestination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const destinationId = req.params.destinationId;
  if (!mongoose.Types.ObjectId.isValid(destinationId)) {
    return res.status(400).json({ message: 'Invalid Destination ID' });
  }

  try {
    const destination = await destinationModel
      .findById(destinationId)
      .populate('featuredTours', '_id title')  // Only populate _id and title fields
      

    if (!destination) {
      return next(createHttpError(404, "Destination not found."));
    }
    
    res.status(200).json({ destination });
  } catch (err) {
    next(createHttpError(500, 'Failed to get destination'));
  }
};

// Create a destination
export const createDestination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, description, coverImage, isActive, country, region, city, userId, featuredTours } = req.body;

  console.log("featuredTours", featuredTours);
  try {
    const newDestination = await destinationModel.create({
      name,
      description,
      coverImage,
      country,
      region,
      city,
      featuredTours: featuredTours || [],
      popularity: 0,
      isActive,
      userId,
    });
    
    res.status(201).json({ destination: newDestination });
  } catch (err) {
    console.error(err);
    next(createHttpError(500, 'Failed to create destination'));
  }
};

// Update a destination
export const updateDestination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const destinationId = req.params.destinationId;
  const updates = req.body;

  console.log("updates", updates);
  
  if (!mongoose.Types.ObjectId.isValid(destinationId)) {
    return res.status(400).json({ message: 'Invalid Destination ID' });
  }
  
  try {
    // Process featuredTours - ensure it's treated as an array
    if (updates.featuredTours && !Array.isArray(updates.featuredTours)) {
      // If it's a single value or string, convert to array
      if (typeof updates.featuredTours === 'string') {
        updates.featuredTours = [updates.featuredTours];
      } else if (updates.featuredTours['0']) {
        // Handle FormData array format (where keys are '0', '1', etc.)
        const tourIds: string[] = [];
        let i = 0;
        while (updates.featuredTours[i.toString()] !== undefined) {
          tourIds.push(updates.featuredTours[i.toString()]);
          i++;
        }
        updates.featuredTours = tourIds;
      }
    }

    console.log("Processed featuredTours:", updates.featuredTours);

    const updatedDestination = await destinationModel.findByIdAndUpdate(
      destinationId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedDestination) {
      return next(createHttpError(404, "Destination not found."));
    }
    
    res.status(200).json({ destination: updatedDestination });
  } catch (err) {
    console.error("Update error:", err);
    next(createHttpError(500, 'Failed to update destination'));
  }
};

// Delete a destination
export const deleteDestination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const destinationId = req.params.destinationId;
  
  if (!mongoose.Types.ObjectId.isValid(destinationId)) {
    return res.status(400).json({ message: 'Invalid Destination ID' });
  }
  
  try {
    const destination = await destinationModel.findByIdAndDelete(destinationId);
    
    if (!destination) {
      return next(createHttpError(404, "Destination not found."));
    }
    
    res.status(200).json({ message: "Destination deleted successfully" });
  } catch (err) {
    next(createHttpError(500, 'Failed to delete destination'));
  }
};

// Get tours by destination
export const getToursByDestination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const destinationId = req.params.destinationId;
  
  if (!mongoose.Types.ObjectId.isValid(destinationId)) {
    return res.status(400).json({ message: 'Invalid Destination ID' });
  }
  
  try {
    const tours = await tourModel.find({ destination: destinationId })
      .populate("author", "name");
      
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get tours for this destination'));
  }
};

// Get popular destinations
export const getPopularDestinations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    const destinations = await destinationModel
      .find()
      .sort({ popularity: -1 })
      .limit(limit);
      
    res.status(200).json({ destinations });
  } catch (err) {
    next(createHttpError(500, 'Failed to get popular destinations'));
  }
};
