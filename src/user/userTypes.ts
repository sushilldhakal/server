
  import { Document, ObjectId } from 'mongoose';

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface IBooking {
  booking_id: ObjectId;
  package_id: ObjectId;
  booking_date: Date;
  travel_date: Date;
  status: string;
  total_price: number;
  payment_status: string;
}

export interface IPaymentMethod {
  type: string;
  details: {
    card_number?: string;
    expiry_date?: string;
    cardholder_name?: string;
    billing_address?: IAddress;
    email?: string;
  };
}

export interface IWishlist {
  package_id: ObjectId;
  added_date: Date;
}

export interface IReview {
  review_id: ObjectId;
  package_id: ObjectId;
  review_date: Date;
  rating: number;
  comment: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: IAddress;
  preferences: {
    language: string;
    currency: string;
    newsletter_subscribed: boolean;
  };
  bookings: IBooking[];
  payment_methods: IPaymentMethod[];
  wishlist: IWishlist[];
  reviews: IReview[];
  roles: ('user' | 'admin')[];
}
