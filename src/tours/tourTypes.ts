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
  }[]
  };
  
