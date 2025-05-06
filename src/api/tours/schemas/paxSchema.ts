import mongoose from 'mongoose';

// Base date range schema used throughout the application
const paxSchema = new mongoose.Schema({
    minSize: {
        type: Number,
        default: 1,
        min: [1, 'Minimum pax must be at least 1']
      },
      maxSize: {
        type: Number,
        default: 10,
        validate: {
          validator: function(value: number): boolean {
            // @ts-ignore - 'this' context in mongoose validators
            return value >= this.minSize;
          },
          message: 'Maximum pax must be greater than or equal to minimum pax'
        }
      }
}, { _id: false });

export default paxSchema;


