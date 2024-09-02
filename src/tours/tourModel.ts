import mongoose from "mongoose";

import {Tour} from "./tourTypes";



const itinerarySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
  },
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
  outline: {
    type: String,
  },
  itinerary: [itinerarySchema], 
  category: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',  // Reference to the Category model
  }],
},
{ timestamps: true }
);


export default mongoose.model<Tour>("Tour", tourSchema)