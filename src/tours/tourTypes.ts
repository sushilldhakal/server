import mongoose, { ObjectId } from 'mongoose';
import {User} from "../user/userTypes";

export interface Tour {
    title: string;
    description: string;
    author: mongoose.Types.ObjectId | User;
    tourCode: string;
    authorName: User;
    coverImage: string;
    file: string;
    createdAt: Date;
  updatedAt: Date;
  status: string;
  }