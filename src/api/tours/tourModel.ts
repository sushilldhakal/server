import mongoose from 'mongoose';
import {Tour} from "./tourTypes";
import promoCodeSchema from "./promoCodeModel";
import paxSchema from "./schemas/paxSchema";
// Import all schemas from the schemas directory
import {
  categorySchema,
  dateRangeSchema,
  departureSchema,
  discountSchema,
  faqSchema,
  factSchema,
  gallerySchema,
  itinerarySchema,
  locationSchema,
  pricingGroupSchema,
  pricingOptionSchema,
  reviewSchema,
  tourDatesSchema as TourDatesSchema
} from './schemas';

// Define main Tour schema
const tourSchema = new mongoose.Schema<Tour>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true // Add index for faster title search
    },
    category: {
      type: [categorySchema],
      required: true,
      index: true // Add index for category filtering
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true // Add index for code lookup
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: false,
      index: true // Add index for destination filtering
    },
    author: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Add index for author filtering
    }],
    description: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
    },
    tourStatus: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Draft',
      index: true // Add index for status filtering
    },
    coverImage: {
      type: String,
    },
    outline: {
      type: String,
    },
    itinerary: {
      type: [itinerarySchema],
      default: [],
    },
    include: String,
    exclude: String,
    facts: [factSchema],
    faqs: [faqSchema],
    gallery: [gallerySchema],
    map: String,
    location: {
      type: locationSchema
    },
    enquiry: {
      type: Boolean,
      default: true,
      required: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    approvedReviewCount: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    isSpecialOffer: {
      type: Boolean,
      default: false,
      index: true // Add index for special offers filtering
    },
    views: {
      type: Number,
      default: 0
    },
    reviews: [reviewSchema],
    fixedDepartures: [{
      type: mongoose.Schema.Types.Mixed
    }],
    promoCodes: {
      type: [promoCodeSchema],
      default: []
    },
    
    // Pricing-related fields
    price: {
      type: Number,
    },
    pricePerPerson: {
      type: Boolean,
      default: true,
    },
    groupSize: {
      type: Number,
      min: 1
    },
    paxRange: {
      type: paxSchema,
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
    
    // Discount related fields
    discount: {
      type: discountSchema,
      required: function(this: any): boolean {
        return this.discountEnabled;
      },
    },
    
    // Advanced pricing options
    pricingOptionsEnabled: {
      type: Boolean,
      default: false,
      index: true // Add index for filtering tours with pricing options
    },
    pricingOptions: [{
      type: pricingOptionSchema,
    }],
    pricingGroups: {
      type: [pricingGroupSchema],
      required: function(this: any): boolean {
        return this.pricingOptionsEnabled;
      },
    },
  
    // Tour dates-related fields 
    fixedDeparture: {
      type: Boolean,
      default: false,
      index: true // Add index for filtering fixed departure tours
    },
    multipleDates: {
      type: Boolean,
      default: false
    },
    
    // Unified tour dates structure
    tourDates: {
      type: TourDatesSchema,
      default: {}
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common search patterns
tourSchema.index({ tourStatus: 1, destination: 1 });
tourSchema.index({ tourStatus: 1, category: 1 });
tourSchema.index({ tourStatus: 1, isSpecialOffer: 1 });

// Text index for full-text search
tourSchema.index(
  { title: 'text', description: 'text', excerpt: 'text' },
  { weights: { title: 10, excerpt: 5, description: 3 } }
);

// Add virtual field for slug (URL-friendly title)
tourSchema.virtual('slug').get(function(this: any) {
  return this.title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
});

// Virtual for active discount calculation
tourSchema.virtual('hasDiscount').get(function(this: any) {
  return this.hasActiveDiscount();
});

// Virtual for discounted price
tourSchema.virtual('discountedPrice').get(function(this: any) {
  return this.getDiscountedPrice();
});

// Virtual for discount percentage
tourSchema.virtual('discountPercentage').get(function(this: any) {
  return this.getDiscountPercentage();
});

// Method to get the effective price considering discounts
tourSchema.methods.getDiscountedPrice = function(this: any): number {
  if (!this.hasActiveDiscount()) {
    return this.price;
  }
  
  // If using percentage discount
  if (this.discount?.percentageOrPrice) {
    const percentage = this.discount.discountPercentage || 0;
    let discountAmount = (this.price * percentage) / 100;
    
    // Apply maximum discount cap if specified
    if (this.discount.maxDiscountAmount && discountAmount > this.discount.maxDiscountAmount) {
      discountAmount = this.discount.maxDiscountAmount;
    }
    
    return this.price - discountAmount;
  } else {
    // Using fixed price discount
    return Math.max(0, this.price - (this.discount?.discountPrice || 0));
  }
};

// Method to get discount percentage
tourSchema.methods.getDiscountPercentage = function(this: any): number {
  if (!this.hasActiveDiscount()) {
    return 0;
  }
  
  // If using percentage discount
  if (this.discount?.percentageOrPrice) {
    return this.discount.discountPercentage || 0;
  } else {
    // Calculate percentage based on fixed price discount
    const discountAmount = this.discount?.discountPrice || 0;
    return this.price > 0 ? Math.min(100, Math.round((discountAmount / this.price) * 100)) : 0;
  }
};

// Method to get discount amount
tourSchema.methods.getDiscountAmount = function(this: any): number {
  if (!this.hasActiveDiscount()) {
    return 0;
  }
  
  // If using percentage discount
  if (this.discount?.percentageOrPrice) {
    const percentage = this.discount.discountPercentage || 0;
    let discountAmount = (this.price * percentage) / 100;
    
    // Apply maximum discount cap if specified
    if (this.discount.maxDiscountAmount && discountAmount > this.discount.maxDiscountAmount) {
      discountAmount = this.discount.maxDiscountAmount;
    }
    
    return discountAmount;
  } else {
    // Using fixed price discount
    return this.discount?.discountPrice || 0;
  }
};

// Check if discount is currently active
tourSchema.methods.hasActiveDiscount = function(this: any): boolean {
  if (!this.discountEnabled || !this.discount) {
    return false;
  }
  
  const now = new Date();
  const discountStart = this.discount.discountDateRange?.from;
  const discountEnd = this.discount.discountDateRange?.to;
  
  return !!(discountStart && discountEnd && now >= discountStart && now <= discountEnd);
};

// Pre-save middleware to calculate average rating
tourSchema.pre('save', function(next) {
  // Calculate average rating if reviews exist
  if (this.reviews && this.reviews.length > 0) {
    const approvedReviews = this.reviews.filter((review: any) => review.status === 'approved');
    
    if (approvedReviews.length > 0) {
      const totalRating = approvedReviews.reduce((sum: number, review: any) => sum + review.rating, 0);
      this.averageRating = totalRating / approvedReviews.length;
      this.approvedReviewCount = approvedReviews.length;
    }
    
    // Total review count includes all reviews regardless of status
    this.reviewCount = this.reviews.length;
  }
  next();
});

// Add custom query methods

// Find tours with active discounts
tourSchema.statics.findWithActiveDiscounts = function() {
  const now = new Date();
  return this.find({
    discountEnabled: true,
    'discount.discountDateRange.from': { $lte: now },
    'discount.discountDateRange.to': { $gte: now },
    tourStatus: 'Published'
  });
};

// Find tours with upcoming departures
tourSchema.statics.findWithUpcomingDepartures = function(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);
  
  return this.find({
    tourStatus: 'Published',
    $or: [
      // Tours with fixed departures
      {
        fixedDeparture: true,
        'tourDates.departures': {
          $elemMatch: {
            'dateRange.from': { $gte: now, $lte: futureDate }
          }
        }
      },
      // Tours with flexible dates that are currently active
      {
        fixedDeparture: false,
        'tourDates.scheduleType': 'flexible',
        'tourDates.defaultDateRange.to': { $gte: now }
      }
    ]
  });
};

// Find tours by location proximity
tourSchema.statics.findByProximity = function(lat: number, lng: number, maxDistanceKm = 50) {
  return this.find({
    tourStatus: 'Published',
    location: {
      $exists: true
    }
  }).exec().then((tours: any[]) => {
    // Calculate distance for each tour
    return tours.filter(tour => {
      if (!tour.location || !tour.location.lat || !tour.location.lng) {
        return false;
      }
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth radius in km
      const dLat = (tour.location.lat - lat) * Math.PI / 180;
      const dLng = (tour.location.lng - lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(tour.location.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= maxDistanceKm;
    });
  });
};

// Export the tour model
const Tour = mongoose.model<Tour>('Tour', tourSchema);

export default Tour;

// Export schemas for use in other files
export { 
  discountSchema, 
  pricingOptionSchema, 
  pricingGroupSchema, 
  departureSchema,
  TourDatesSchema,
};