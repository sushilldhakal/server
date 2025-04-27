import mongoose, { Document } from 'mongoose';

export interface IReview extends Document {
    user: mongoose.Types.ObjectId;
    tour: mongoose.Types.ObjectId;
    rating: number;
    text: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    views: number;
    replies: {
        user: mongoose.Types.ObjectId;
        comment: string;
        createdAt: Date;
        likes: number;
        views: number;
    }[];
}