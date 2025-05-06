import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(val: number) {
        return Number.isInteger(val);
      },
      message: 'Rating must be an integer'
    }
  },
  title: {
    type: String,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  images: [{
    type: String
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, { 
  timestamps: true 
});

// Create text index for searchable reviews
reviewSchema.index({ title: 'text', text: 'text' });
// Add index for filtering by status and sorting by date
reviewSchema.index({ status: 1, createdAt: -1 });
// Add index for user reviews
reviewSchema.index({ user: 1 });

export default reviewSchema;
