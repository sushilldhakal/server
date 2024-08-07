import mongoose, { Schema } from 'mongoose';
import { GalleryDocument, Image } from './galleryTypes';

const imageSchema = new Schema<Image>({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  url: { type: String, required: true },
  description: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  asset_id: { type: String, required: true },
});

const gallerySchema: Schema<GalleryDocument> = new mongoose.Schema(
    {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        images: [imageSchema],
        PDF: [imageSchema],
      },
      { timestamps: true }
    );

const Gallery = mongoose.model<GalleryDocument>('Gallery', gallerySchema);

export default Gallery;
