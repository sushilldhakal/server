import mongoose from 'mongoose';

// Base date range schema used throughout the application
const dateRangeSchema = new mongoose.Schema({
  from: { 
    type: Date, 
    required: true 
  },
  to: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(value: Date): boolean {
        // @ts-ignore - 'this' context in mongoose validators
        return value >= this.from;
      },
      message: 'End date must be after or equal to start date'
    }
  },
}, { _id: false });

export default dateRangeSchema;
