import mongoose, { Document, Schema } from 'mongoose';
import {User} from "../user/userTypes";

// Define pricing option interface
export interface PricingOption {
  name: string;
  price: number;
  saleEnabled?: boolean;
  salePrice?: number;
  paxRange?: [number, number]; // [min, max] number of people
}

// Define date range interface
export interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
  selectedOptions: string[]; // Names of the pricing options that apply to this date range
}

// Define pricing group interface
export interface PricingGroup {
  label: string;
  options: PricingOption[];
  dateRanges: DateRange[];
}

// Define a notification for fixed departure tours
export interface FixedDepartureNotification {
  userId: mongoose.Types.ObjectId;
  notificationType: 'booking_confirmation' | 'cancellation' | 'reminder' | 'update';
  notifiedAt: Date;
  isRead: boolean;
}

// Define fixed departure interface
export interface FixedDeparture {
  _id?: mongoose.Types.ObjectId;
  tourId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  pricingCategory: 'standard' | 'premium' | 'budget' | 'custom';
  customPricingCategory?: string;
  price: number;
  discountPrice?: number;
  isDiscounted: boolean;
  minPax: number;
  maxPax: number;
  currentPax: number;
  cutOffHoursBefore: number;
  isForceCanceled: boolean;
  forceCancelReason?: string;
  notifiedUsers: FixedDepartureNotification[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define AddOn interface
export interface AddOn {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  isDiscounted: boolean;
  isRequired: boolean;
  maxQuantity: number;
  category: 'transportation' | 'accommodation' | 'activity' | 'meal' | 'equipment' | 'insurance' | 'guide' | 'other';
  customCategory?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define PromoCode interface
export interface PromoCode {
  _id?: mongoose.Types.ObjectId;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  startDate: Date;
  endDate: Date;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  applicableTours: mongoose.Types.ObjectId[] | 'all';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tour extends Document {
    title: string;
    description: string;
    author: mongoose.Types.ObjectId | User;
    code: string;
    // Old pricing (keeping for backward compatibility)
    price: number;
    originalPrice?: number;
    // New advanced pricing structure
    basePrice?: number;
    pricePerPerson?: boolean;
    groupSize?: number;
    saleEnabled?: boolean;
    salePrice?: number;
    pricingOptionsEnabled?: boolean;
    pricingGroups?: PricingGroup[];
    authorName: User;
    coverImage: string;
    file: string;
    createdAt: Date;
    updatedAt: Date;
    tourStatus: string;
    outline: string;
    itinerary:{
      day?: string;
      title: string;
      description: string;
      date?: Date;
    }[];
    category: {
      categoryId: mongoose.Types.ObjectId;
      categoryName: string;
    }[],
    dates: {
      id: mongoose.Types.ObjectId;
      tripDuration: string;
      startDate: Date;
      endDate: Date;
    },
    include: string;
    exclude: string;
    facts: {
      id: mongoose.Types.ObjectId;
      title?: string;
      field_type?: "Plain Text" | "Single Select" | "Multi Select";
      value?: string[] | { label: string; value: string; }[];
      icon?: string;
    }[],
    faqs: {
      id: mongoose.Types.ObjectId;
      question: string;
      answer: string;
    }[],
    reviews: Review[];
    gallery: {
      id: mongoose.Types.ObjectId;
      image: string;
    }[],
    map: string,
    location:{
      id: mongoose.Types.ObjectId;
      street: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      lng: number;
    },
    enquiry: boolean;
    discount?: Discount;
    isSpecialOffer: boolean;
    averageRating: number;
    reviewCount: number;
    approvedReviewCount: number;
    fixedDepartures: FixedDeparture[];
    addOns?: AddOn[];
    promoCodes?: PromoCode[];
    views: number;
    bookingCount: number;
    destination?: mongoose.Types.ObjectId;
    
    // Discount-related methods
    hasActiveDiscount(): boolean;
    getDiscountedPrice(): number;
    getDiscountPercentage(): number;
    getDiscountAmount(): number;
    discountedPrice?: number; // Virtual property
}

export interface ReviewReply {
    _id?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    comment: string;
    createdAt: Date;
    likes: number;
    views: number;
}

export interface Review {
    _id?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    likes: number;
    views: number;
    replies: ReviewReply[];
    createdAt: Date;
}

export interface Discount {
    percentage: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    description?: string;
    discountCode?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface FactValue {
    value?: string;
    label?: string;
    [key: string]: any; // Adjust this if you have specific keys or values
}

export interface Destination extends Document {
    name: string;
    description: string;
    coverImage: string;
    country: string;
    region?: string;
    city?: string;
    popularity: number;
    featuredTours?: mongoose.Types.ObjectId[];
    isActive: boolean;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}