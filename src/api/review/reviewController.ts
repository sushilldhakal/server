import { Request, Response } from 'express';
import { Review } from './reviewModel';
import { Tour } from '../tours/tourModel';
import mongoose from 'mongoose';

// Create a new review
export const createReview = async (req: Request, res: Response) => {
    try {
        const { tourId } = req.params;
        const userId = req.user?._id;

        // Check if tour exists
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ message: 'Tour not found' });
        }

        // Check if user has already reviewed this tour
        const existingReview = await Review.findOne({ user: userId, tour: tourId });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this tour' });
        }

        const review = new Review({
            ...req.body,
            user: userId,
            tour: tourId
        });

        await review.save();

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'name email')
            .populate('tour', 'title');

        res.status(201).json(populatedReview);
    } catch (error) {
        res.status(500).json({ message: 'Error creating review', error });
    }
};

// Get all reviews for a tour
export const getTourReviews = async (req: Request, res: Response) => {
    try {
        const { tourId } = req.params;
        
        const reviews = await Review.find({ tour: tourId })
            .populate('user', 'name email')
            .populate('tour', 'title')
            .sort('-createdAt');

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reviews', error });
    }
};

// Get a specific review
export const getReview = async (req: Request, res: Response) => {
    try {
        const review = await Review.findById(req.params.reviewId)
            .populate('user', 'name email')
            .populate('tour', 'title');

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching review', error });
    }
};

// Update a review
export const updateReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user?._id;

        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if the user owns the review
        if (review.user.toString() !== userId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this review' });
        }

        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            { ...req.body },
            { new: true, runValidators: true }
        )
            .populate('user', 'name email')
            .populate('tour', 'title');

        res.json(updatedReview);
    } catch (error) {
        res.status(500).json({ message: 'Error updating review', error });
    }
};

// Delete a review
export const deleteReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user?._id;

        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if the user owns the review
        if (review.user.toString() !== userId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }

        await review.remove();
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting review', error });
    }
};

// Get average rating for a tour
export const getTourRating = async (req: Request, res: Response) => {
    try {
        const { tourId } = req.params;

        const stats = await Review.aggregate([
            {
                $match: { tour: new mongoose.Types.ObjectId(tourId) }
            },
            {
                $group: {
                    _id: '$tour',
                    averageRating: { $avg: '$rating' },
                    numberOfReviews: { $sum: 1 }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                averageRating: 0,
                numberOfReviews: 0
            });
        }

        res.json({
            averageRating: stats[0].averageRating,
            numberOfReviews: stats[0].numberOfReviews
        });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating tour rating', error });
    }
};