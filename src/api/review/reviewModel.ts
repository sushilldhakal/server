import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    user: mongoose.Types.ObjectId;
    tour: mongoose.Types.ObjectId;
    rating: number;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tour: {
        type: Schema.Types.ObjectId,
        ref: 'Tour',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    }
}, {
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

// Call calculateAverageRating before remove
reviewSchema.pre('remove', function() {
    // @ts-ignore
    this.constructor.calculateAverageRating(this.tour);
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);