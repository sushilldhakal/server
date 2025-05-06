import mongoose from 'mongoose';

const factSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  field_type: {
    type: String,
    enum: ['Plain Text', 'Single Select', 'Multi Select'],
    default: 'Plain Text'
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Allow different types of values based on field_type
    required: true,
    validate: {
      validator: function(this: any, value: any) {
        if (this.field_type === 'Multi Select') {
          return Array.isArray(value) && value.every((item: any) => 
            typeof item === 'object' && item.label && item.value);
        }
        if (this.field_type === 'Single Select') {
          return Array.isArray(value) && value.length <= 1;
        }
        // For plain text, allow strings or arrays of strings
        return typeof value === 'string' || 
          (Array.isArray(value) && value.every((item: any) => typeof item === 'string'));
      },
      message: 'Value format does not match the specified field type'
    }
  },
  icon: {
    type: String
  }
}, { 
  _id: true,
  timestamps: false 
});

// Add text index for searchable facts
factSchema.index({ title: 'text' });

export default factSchema;
