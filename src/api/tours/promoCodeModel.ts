import mongoose from "mongoose";
import { PromoCode } from "./tourTypes";

// Subschema for Promo Codes
const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(this: any, value: number) {
        return this.discountType !== 'percentage' || value <= 100;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  minPurchaseAmount: {
    type: Number,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: any, value: Date) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  maxUses: {
    type: Number,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableTours: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Tour',
    default: 'all',
    validate: {
      validator: function(this: any, value: any) {
        return value === 'all' || (Array.isArray(value) && value.length > 0);
      },
      message: 'Applicable tours must be "all" or a non-empty array of tour IDs'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

export default promoCodeSchema;
