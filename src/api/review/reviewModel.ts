import mongoose, { Schema } from 'mongoose';
import { IReview } from './reviewTypes';


const reviewSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 5,
        get: (v: number) => Math.round(v * 2) / 2, // Round to nearest 0.5
        set: (v: number) => Math.round(v * 2) / 2, // Round to nearest 0.5
    },
    comment: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    likes: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        comment: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        likes: {
            type: Number,
            default: 0
        },
        views: {
            type: Number,
            default: 0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
},
{
    timestamps: true
});

// Compound index to ensure one review per user per tour
reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

// Static method to calculate average rating for a tour
reviewSchema.statics.calculateAverageRating = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                averageRating: { $avg: '$rating' },
                numberOfReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await mongoose.model('Tour').findByIdAndUpdate(tourId, {
            averageRating: stats[0].averageRating,
            numberOfReviews: stats[0].numberOfReviews
        });
    }
};

// Call calculateAverageRating after save
reviewSchema.post('save', function() {
    // @ts-ignore
    this.constructor.calculateAverageRating(this.tour);
});

// Call calculateAverageRating before findOneAndDelete
reviewSchema.pre('findOneAndDelete', function() {
    // @ts-ignore
    this.constructor.calculateAverageRating(this.tour);
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);