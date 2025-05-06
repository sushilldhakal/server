import mongoose from 'mongoose';
import discountSchema from './discountSchema';

// Subschema for Pricing Option
const pricingOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ["adult", "child", "senior", "student", "custom"],
    default: "adult",
    index: true // Add index for queries that filter by category
  },
  customCategory: {
    type: String,
    trim: true,
    required: function(this: any) {
      return this.category === 'custom';
    }
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be a positive number']
  },
  discountEnabled: {
    type: Boolean,
    default: false
  },
  discount: {
    type: discountSchema,
    required: function(this: any) {
      return this.discountEnabled;
    }
  },
 
}, { 
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for effective price (considering discounts)
pricingOptionSchema.virtual('effectivePrice').get(function(this: any) {
  if (!this.discountEnabled || !this.discount) {
    return this.price;
  }
  
  // Check if discount is currently active
  const now = new Date();
  const discountStart = this.discount.discountDateRange?.from;
  const discountEnd = this.discount.discountDateRange?.to;
  
  if (!discountStart || !discountEnd || now < discountStart || now > discountEnd) {
    return this.price;
  }
  
  // Calculate discounted price
  if (this.discount.percentageOrPrice) {
    // Percentage-based discount
    const percentage = this.discount.discountPercentage || 0;
    let discountAmount = (this.price * percentage) / 100;
    
    // Apply maximum discount cap if specified
    if (this.discount.maxDiscountAmount && discountAmount > this.discount.maxDiscountAmount) {
      discountAmount = this.discount.maxDiscountAmount;
    }
    
    return this.price - discountAmount;
  } else {
    // Fixed price discount
    return Math.max(0, this.price - (this.discount.discountPrice || 0));
  }
});

// Add custom method to check if discount is active
pricingOptionSchema.methods.hasActiveDiscount = function(this: any): boolean {
  if (!this.discountEnabled || !this.discount) {
    return false;
  }
  
  const now = new Date();
  const discountStart = this.discount.discountDateRange?.from;
  const discountEnd = this.discount.discountDateRange?.to;
  
  return !!(discountStart && discountEnd && now >= discountStart && now <= discountEnd);
};

export default pricingOptionSchema;
