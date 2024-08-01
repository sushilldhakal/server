import mongoose from "mongoose";

import {Tour} from "./tourTypes";



const itinerarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
}, { _id: false });

const tourSchema = new mongoose.Schema<Tour>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
    },
    price: {
      type: Number,
    },
    author: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
  }],

      coverImage: {
        type: String,
    },
    file: {
        type: String,
    },
    tourStatus: {
      type: String,
      enum: ['Draft', 'Published', 'Archived', 'Expired'],
      default: 'Published',
  },
  itinerary: [itinerarySchema], 
},
{ timestamps: true }
);


export default mongoose.model<Tour>("Tour", tourSchema)