import mongoose from 'mongoose';

// Subschema for Category
const categorySchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  disable: {
    type: Boolean,
    default: false,
  },
}, { 
  _id: false,
  // Add index for faster querying of categories by value
  timestamps: false
});

// Add index for faster lookups by value
categorySchema.index({ value: 1 });

export default categorySchema;
