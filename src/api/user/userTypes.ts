import mongoose from 'mongoose';

// Interface for seller information
export interface SellerInfo {
  companyName: string;
  companyRegistrationNumber: string;
  companyType: string;
  registrationDate: string;
  taxId: string;
  website?: string;
  businessAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };
  businessDescription: string;
  sellerType: string;
  isApproved: boolean;
  appliedAt: Date;
  approvedAt?: Date;
}

export interface User{
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  roles: string;
  phone: number;
  verified: boolean;
  avatar: string;
  wishlists: string[];
  bookings: string[];
  reviews: string[];
  payment_methods: string[];
  sellerInfo?: SellerInfo;
  createdAt: Date;
  updatedAt: Date;
}
