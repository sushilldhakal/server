import mongoose from 'mongoose';

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
  createdAt: Date;
  updatedAt: Date;
}
