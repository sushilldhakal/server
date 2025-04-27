import mongoose from "mongoose";
import { Destination } from "../tours/tourTypes";

const destinationSchema = new mongoose.Schema<Destination>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: false,
    },
    region: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    featuredTours: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model<Destination>("Destination", destinationSchema);
