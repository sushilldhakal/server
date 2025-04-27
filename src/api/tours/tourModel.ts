import mongoose from "mongoose";
import addOnSchema from "./addOnModel";
import {Tour} from "./tourTypes";
import promoCodeSchema from "./promoCodeModel";

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
  },
  endDate: {
      type: Date,
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
}, { timestamps: true });
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

// Subschema for Discount
const discountSchema = new mongoose.Schema({
  percentage: {
      type: Number,
      required: function(this: any): boolean {
        return this.isActive;
      },
      min: 0,
      max: 100
  },
  startDate: {
      type: Date,
      required: function(this: any): boolean {
        return this.isActive;
      },
  },
  endDate: {
      type: Date,
      required: function(this: any): boolean {
        return this.isActive;
      },
  },
  isActive: {
      type: Boolean,
      default: false
  },
  description: {
      type: String,
      required: false,
  },
  discountCode: {
      type: String,
      required: false,
  },
  minPurchaseAmount: {
      type: Number,
      required: false,
  },
  maxDiscountAmount: {
      type: Number,
      required: false,
  },
}, { _id: false, timestamps: true });

// Subschema for Pricing Option
const pricingOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  saleEnabled: {
    type: Boolean,
    default: false,
  },
  salePrice: {
    type: Number,
    required: function(this: any): boolean {
      return this.saleEnabled;
    },
  },
  paxRange: {
    type: [Number],
    validate: {
      validator: function(v: number[]) {
        return v.length === 2 && v[0] <= v[1];
      },
      message: 'paxRange must be an array with 2 elements where first element is less than or equal to second'
    },
    required: false,
  }
}, { _id: false });

// Subschema for Date Range
const dateRangeSchema = new mongoose.Schema({
  label: {
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
  },
  selectedOptions: {
    type: [String],
    required: true,
  }
}, { _id: false });

// Subschema for Pricing Group
const pricingGroupSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  options: {
    type: [pricingOptionSchema],
    required: true,
    validate: {
      validator: function(v: any[]) {
        return v.length > 0;
      },
      message: 'At least one pricing option is required'
    }
  },
  dateRanges: {
    type: [dateRangeSchema],
    required: true,
    validate: {
      validator: function(v: any[]) {
        return v.length > 0;
      },
      message: 'At least one date range is required'
    }
  }
}, { _id: false });

// Subschema for Fixed Departure Dates
const fixedDepartureSchema = new mongoose.Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  pricingCategory: {
    type: String,
    required: true,
    enum: ['standard', 'premium', 'budget', 'custom']
  },
  customPricingCategory: {
    type: String,
    required: function(this: any): boolean {
      return this.pricingCategory === 'custom';
    }
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
  minPax: {
    type: Number,
    default: 1,
    min: 1
  },
  maxPax: {
    type: Number,
    required: true,
    min: 1
  },
  currentPax: {
    type: Number,
    default: 0,
    min: 0
  },
  cutOffHoursBefore: {
    type: Number,
    default: 24,
    min: 0
  },
  isForceCanceled: {
    type: Boolean,
    default: false
  },
  forceCancelReason: {
    type: String,
    required: function(this: any): boolean {
      return this.isForceCanceled === true;
    }
  },
  notifiedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notificationType: {
      type: String,
      enum: ['booking_confirmation', 'cancellation', 'reminder', 'update']
    },
    notifiedAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'canceled'],
    default: 'scheduled'
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
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

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
    // Old pricing (keeping for backward compatibility)
    price: {
      type: Number,
    },
    originalPrice: {
      type: Number,
    },
    // New advanced pricing structure
    basePrice: {
      type: Number,
    },
    pricePerPerson: {
      type: Boolean,
      default: true,
    },
    groupSize: {
      type: Number,
    },
    saleEnabled: {
      type: Boolean,
      default: false, 
    },
    salePrice: {
      type: Number,
      required: function(this: any): boolean {
        return this.saleEnabled;
      },
    },
    pricingOptionsEnabled: {
      type: Boolean,
      default: false,
    },
    pricingGroups: {
      type: [pricingGroupSchema],
      required: function(this: any): boolean {
        return this.pricingOptionsEnabled;
      },
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
    },
    discount: discountSchema,
    isSpecialOffer: {
      type: Boolean,
      default: false
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: false
    },
    views: {
      type: Number,
      default: 0
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    approvedReviewCount: {
      type: Number,
      default: 0
    },
    fixedDepartures: {
      type: [fixedDepartureSchema],
      default: []
    },
    addOns: {
      type: [addOnSchema],
      default: []
    },
    promoCodes: {
      type: [promoCodeSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Pre-save middleware to calculate average rating - only count approved reviews
tourSchema.pre('save', async function(next) {
  if (this.reviews && this.reviews.length > 0) {
    // Filter only approved reviews for rating calculation
    const approvedReviews = this.reviews.filter(review => review.status === 'approved');
    
    if (approvedReviews.length > 0) {
      const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
      this.averageRating = totalRating / approvedReviews.length;
      this.approvedReviewCount = approvedReviews.length;
    }
    
    // Total review count includes all reviews regardless of status
    this.reviewCount = this.reviews.length;
  }
  next();
});

// Method to check if a tour has an active discount
tourSchema.methods.hasActiveDiscount = function(this: Tour): boolean {
  if (!this.discount || !this.discount.isActive) {
    return false;
  }
  
  const now = new Date();
  return this.discount.startDate <= now && this.discount.endDate >= now;
};

// Method to get the discounted price
tourSchema.methods.getDiscountedPrice = function(this: Tour): number {
  if (!this.hasActiveDiscount()) {
    return this.price;
  }
  
  const discountAmount = (this.price * this.discount!.percentage) / 100;
  
  // Apply maximum discount cap if specified
  if (this.discount!.maxDiscountAmount && discountAmount > this.discount!.maxDiscountAmount) {
    return this.price - this.discount!.maxDiscountAmount;
  }
  
  return this.price - discountAmount;
};

// Method to get discount percentage
tourSchema.methods.getDiscountPercentage = function(this: Tour): number {
  if (!this.hasActiveDiscount()) {
    return 0;
  }
  
  return this.discount!.percentage;
};

// Method to get discount amount
tourSchema.methods.getDiscountAmount = function(this: Tour): number {
  if (!this.hasActiveDiscount()) {
    return 0;
  }
  
  const discountAmount = (this.price * this.discount!.percentage) / 100;
  
  // Apply maximum discount cap if specified
  if (this.discount!.maxDiscountAmount && discountAmount > this.discount!.maxDiscountAmount) {
    return this.discount!.maxDiscountAmount;
  }
  
  return discountAmount;
};

// Virtual for discounted price
tourSchema.virtual('discountedPrice').get(function(this: Tour) {
  return this.getDiscountedPrice();
});

// Add virtuals to JSON
tourSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    const tourDoc = doc as unknown as Tour;
    if (tourDoc.hasActiveDiscount && tourDoc.hasActiveDiscount()) {
      ret.hasDiscount = true;
      ret.discountPercentage = tourDoc.getDiscountPercentage();
      ret.discountAmount = tourDoc.getDiscountAmount();
      ret.originalPrice = tourDoc.price;
      ret.discountedPrice = tourDoc.getDiscountedPrice();
    } else {
      ret.hasDiscount = false;
    }
    return ret;
  }
});

// Add virtuals to Object
tourSchema.set('toObject', { virtuals: true });

const Tour = mongoose.model<Tour>("Tour", tourSchema);

export default Tour;