import path from 'node:path';
import fs from 'node:fs';
import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';
import cloudinary from '../config/cloudinary';
import userModel from '../user/userModel';
import { AuthRequest } from "../middlewares/authenticate";


export const createTour = async (req: Request, res: Response, next: NextFunction) => {
  const { name, genre, description } = req.body;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  // 'application/pdf'
  const coverImageMimeType = files.coverImage[0].mimetype.split("/").at(-1);
  const fileName = files.coverImage[0].filename;
  const filePath = path.resolve(
      __dirname,
      "../../public/data/uploads",
      fileName
  );
  const coverImage = files.coverImage[0];
  const tourFile = files.file[0];

  const coverImageName = coverImage.filename;
  const coverImagePath = path.resolve(__dirname, "../../public/data/uploads", coverImageName);

  try {
      const uploadResult = await cloudinary.uploader.upload(filePath, {
          filename_override: fileName,
          folder: "tour-covers",
          format: coverImageMimeType,
      });

      const tourFileName = files.file[0].filename;
      const tourFilePath = path.resolve(
          __dirname,
          "../../public/data/uploads",
          tourFileName
      );

      const tourFileUploadResult = await cloudinary.uploader.upload(
          tourFilePath,
          {
              resource_type: "raw",
              filename_override: tourFileName,
              folder: "tour-pdfs",
              format: "pdf",
          }
      );
      const _req = req as AuthRequest;

      const newTour = await tourModel.create({
          name,
          description,
          genre,
          author: _req.userId,
          coverImage: uploadResult.secure_url,
          file: tourFileUploadResult.secure_url,
      });

      // Delete temp.files
      try {
        await fs.promises.unlink(coverImagePath);
        await fs.promises.unlink(tourFilePath);
      } catch (cleanupErr) {
        console.error('Error cleaning up uploaded files:', cleanupErr);
      }

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

      return res.json(tour);
  } catch (err) {
      return next(createHttpError(500, "Error while getting a tour"));
  }
};


// Update a tour
export const updateTour = async (req: Request, res: Response, next: NextFunction) => {
  const { title, description, genre } = req.body;
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

    // Check if image field exists
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let completeCoverImage = "";
    if (files.coverImage) {
      const filename = files.coverImage[0].filename;
      const coverMimeType = files.coverImage[0].mimetype.split("/").pop();
      const filePath = path.resolve(__dirname, "../../public/data/uploads/" + filename);

      const uploadResult = await cloudinary.uploader.upload(filePath, {
        filename_override: filename,
        folder: "tour-covers",
        format: coverMimeType,
      });

      completeCoverImage = uploadResult.secure_url;
      await fs.promises.unlink(filePath);
    }

    // Check if file field exists
    let completeFileName = "";
    if (files.file) {
      const tourFilePath = path.resolve(__dirname, "../../public/data/uploads/" + files.file[0].filename);

      const uploadResultPdf = await cloudinary.uploader.upload(tourFilePath, {
        resource_type: "raw",
        filename_override: files.file[0].filename,
        folder: "tour-pdfs",
        format: "pdf",
      });

      completeFileName = uploadResultPdf.secure_url;
      await fs.promises.unlink(tourFilePath);
    }

    const updatedTour = await tourModel.findOneAndUpdate(
      { _id: tourId },
      {
        title,
        description,
        genre,
        coverImage: completeCoverImage || tour.coverImage,
        file: completeFileName || tour.file,
      },
      { new: true }
    );

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
    const tour = await tourModel.findOne({ _id: tourId });
    if (!tour) {
      return next(createHttpError(404, "Tour not found"));
    }

    // Check Access
    const _req = req as AuthRequest;
    if (tour.author.toString() !== _req.userId || _req.roles !== 'admin') {
      return next(createHttpError(403,"You cannot delete others' tour."));
    }

    // Extract public IDs for deletion
    const coverFileSplits = tour.coverImage.split("/");
    const coverImagePublicId =
      coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);

    const tourFileSplits = tour.file.split("/");
    const tourFilePublicId =
      tourFileSplits.at(-2) + "/" + tourFileSplits.at(-1);

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
      data: {
        tours,
      },
    });
  } catch (err) {
    console.error('Get Latest Tours Error:', err);
    next(createHttpError(500, 'Failed to fetch latest tours'));
  }
};

// Get tours by rating
export const getToursByRating = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel
      .find()
      .sort({ rating: -1 })
      .limit(10);

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

// Get discounted tours
export const getDiscountedTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
export const searchTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let query: any = {};

    if (req.query.name) {
      query.name = { $regex: req.query.name as string, $options: 'i' };
    }

    if (req.query.destinations) {
      query['locations.city'] = { $in: (req.query.destinations as string).split(',') };
    }

    if (req.query.type) {
      query.type = req.query.type as string;
    }

    if (req.query.minDuration || req.query.maxDuration) {
      query.duration = {};
      if (req.query.minDuration) {
        query.duration.$gte = parseInt(req.query.minDuration as string, 10);
      }
      if (req.query.maxDuration) {
        query.duration.$lte = parseInt(req.query.maxDuration as string, 10);
      }
    }

    if (req.query.startDate || req.query.endDate) {
      query['dates.date'] = {};
      if (req.query.startDate) {
        query['dates.date'].$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query['dates.date'].$lte = new Date(req.query.endDate as string);
      }
    }

    if (req.query.minPrice || req.query.maxPrice) {
      query['dates.price'] = {};
      if (req.query.minPrice) {
        query['dates.price'].$gte = parseInt(req.query.minPrice as string, 10);
      }
      if (req.query.maxPrice) {
        query['dates.price'].$lte = parseInt(req.query.maxPrice as string, 10);
      }
    }

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


