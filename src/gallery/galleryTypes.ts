import mongoose from "mongoose";

export interface Image {
    _id: mongoose.Types.ObjectId;
    url: string;
    asset_id: string; 
    description?: string;
    uploadedAt: Date;
  }
  
  export interface GalleryDocument extends mongoose.Document {
    user: mongoose.Types.ObjectId;
    images: Image[];
  }