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

const datesSchema = new mongoose.Schema({
  tripDuration: {
      type: String,
      required: true,
  },
  startDate: {
      type: Date,
      required: true,
  },
  endDate: {
      type: Date,
      required: true,
  }
}, { _id: false });

// Subschema for Facts
const factSchema = new mongoose.Schema({
  title: {
      type: String,
      required: true,
  },
  field_type: {
      type: String,
      required: true,
      enum: ['Plain Text', 'Single Select', 'Multi Select'],
  },
  value: [{
    type: [mongoose.Schema.Types.Mixed], 
      required: true,
  }],
  icon: {
      type: String,
      required: false,
  },
}, { _id: false });

// Subschema for FAQs
const faqSchema = new mongoose.Schema({
  question: {
      type: String,
      required: true,
  },
  answer: {
      type: String,
      required: true,
  },
}, { _id: false });


// Subschema for Reviews
const reviewSchema = new mongoose.Schema({
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
  },
  rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
  },
  comment: {
      type: String,
      required: true,
  },
}, { _id: false });

// Subschema for Gallery
const gallerySchema = new mongoose.Schema({
  image: {
      type: String,
      required: true,
  },
}, { _id: false });

// Subschema for Location
const locationSchema = new mongoose.Schema({
  street: {
      type: String,
      required: true,
  },
  city: {
      type: String,
      required: true,
  },
  state: {
      type: String,
      required: true,
  },
  country: {
      type: String,
      required: true,
  },
  lat: {
      type: Number,
      required: true,
  },
  lng: {
      type: Number,
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',  // Reference to the Category model
      required: true,
    },
    categoryName: {
      type: String,     // Name of the category to store alongside the reference
      required: true,
    }
  }],

  dates: datesSchema,
  include: String,
  exclude: String,
  facts: [factSchema],
  faqs: [faqSchema],
  reviews: [reviewSchema],
  gallery: [gallerySchema],
  map: {
      type: String,
  },
  location: locationSchema,
  enquiry:  {
    type: Boolean,     // Name of the category to store alongside the reference
    default: true,
    required: true,
  }
},
{ timestamps: true }
);


export default mongoose.model<Tour>("Tour", tourSchema)