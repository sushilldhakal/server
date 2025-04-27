import mongoose from "mongoose";
import { AddOn } from "./tourTypes";

// Subschema for AddOns
const addOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  isDiscounted: {
    type: Boolean,
    default: false
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  maxQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  category: {
    type: String,
    required: true,
    enum: ['transportation', 'accommodation', 'activity', 'meal', 'equipment', 'insurance', 'guide', 'other']
  },
  customCategory: {
    type: String,
    required: function(this: any): boolean {
      return this.category === 'other';
    }
  },
  image: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default addOnSchema;
