import mongoose, { Document, Schema } from 'mongoose';
import {User} from "../user/userTypes";

export interface Tour extends Document {
    title: string;
    description: string;
    author: mongoose.Types.ObjectId | User;
    code: string;
    price: number;
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
    id: mongoose.Types.ObjectId;
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
    title: string;
    field_type: string;
    value:string[];
    icon: string;
  }[],
  faqs: {
    id: mongoose.Types.ObjectId;
    question: string;
    answer: string;
  }[],
reviews: {
    user: mongoose.Types.ObjectId;
    rating: number;
    comment: string
}[],
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
}


export interface FactValue {
  value?: string;
  [key: string]: any; // Adjust this if you have specific keys or values
}