import mongoose from 'mongoose';
import { PricingOption, DateRange, FactValue } from '../tourTypes';

/**
 * Data Processing Utilities
 * Centralized functions for processing complex form data
 */

/**
 * Parse JSON field safely
 */
export const parseJsonField = (field: any, defaultValue: any = undefined) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return defaultValue;
    }
  }
  return field || defaultValue;
};

/**
 * Convert various boolean representations to actual boolean
 */
export const convertToBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
};

/**
 * Safely convert to number with fallback
 */
export const safeToNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Process category data from form submission
 */
export const processCategoryData = (category: any): Array<any> => {
  try {
    console.log('Processing category data:', JSON.stringify(category, null, 2));
    
    // Handle category data as JSON string
    if (typeof category === 'string') {
      try {
        const parsedCategories = JSON.parse(category);
        if (Array.isArray(parsedCategories)) {
          return parsedCategories.map((cat: any) => ({
            value: cat.categoryId || cat.id || cat.value || new mongoose.Types.ObjectId().toString(),
            label: cat.categoryName || cat.name || cat.label || 'Category',
            categoryId: new mongoose.Types.ObjectId(cat.categoryId || cat.id || cat.value),
            categoryName: cat.categoryName || cat.name || cat.label || 'Category'
          }));
        }
      } catch (parseError) {
        console.error('Error parsing category JSON string:', parseError);
      }
    }
    
    // Handle special case with mixed object structure
    if (category && typeof category === 'object' && !Array.isArray(category) && category[''] && typeof category[''] === 'string') {
      const parsedCategories = JSON.parse(category['']);
      return parsedCategories.map((cat: any) => ({
        value: cat.id || cat.value || new mongoose.Types.ObjectId().toString(),
        label: cat.name || cat.label || 'Category',
        categoryId: new mongoose.Types.ObjectId(cat.id || cat.value),
        categoryName: cat.name || cat.label || 'Category'
      }));
    }
    
    // Handle array of categories
    if (Array.isArray(category)) {
      return category.map((cat: any) => {
        const catId = cat.id || cat.value || cat.categoryId;
        const catName = cat.name || cat.label || cat.categoryName;
        
        return {
          value: catId,
          label: catName,
          categoryId: new mongoose.Types.ObjectId(catId),
          categoryName: catName
        };
      });
    }
    
    // Handle single category object
    if (category && typeof category === 'object') {
      const catId = category.id || category.value || category.categoryId;
      const catName = category.name || category.label || category.categoryName;
      
      return [{
        value: catId,
        label: catName,
        categoryId: new mongoose.Types.ObjectId(catId),
        categoryName: catName
      }];
    }
    
    console.log('No valid category data found');
    return [];
  } catch (error) {
    console.error("Error processing category:", error);
    return [];
  }
};

/**
 * Process pricing options data
 */
export const processPricingOptions = (pricingOptionsData: any): PricingOption[] => {
  try {
    const parsed = parseJsonField(pricingOptionsData, []);
    
    if (!Array.isArray(parsed)) {
      console.warn('Pricing options is not an array:', parsed);
      return [];
    }
    
    return parsed.map((option: any) => ({
      name: option.name || option.optionName || '',
      category: option.category || 'adult',
      customCategory: option.customCategory,
      price: safeToNumber(option.price || option.optionPrice),
      discountEnabled: convertToBoolean(option.discountEnabled),
      discountPrice: safeToNumber(option.discountPrice),
      discountDateRange: option.discountDateRange ? {
        from: new Date(option.discountDateRange.from || option.discountDateRange.startDate),
        to: new Date(option.discountDateRange.to || option.discountDateRange.endDate)
      } : undefined,
      paxRange: {
        from: safeToNumber(option.paxRange?.from || option.paxRange?.minSize, 1),
        to: safeToNumber(option.paxRange?.to || option.paxRange?.maxSize, 10)
      }
    }));
  } catch (error) {
    console.error("Error processing pricing options:", error);
    return [];
  }
};

/**
 * Process date ranges data
 */
export const processDateRanges = (dateRangesData: any): DateRange[] => {
  try {
    const parsed = parseJsonField(dateRangesData, []);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed.map((range: any) => ({
      label: range.label || 'Date Range',
      startDate: new Date(range.startDate || range.dateRange?.from),
      endDate: new Date(range.endDate || range.dateRange?.to),
      selectedOptions: Array.isArray(range.selectedOptions) ? range.selectedOptions : []
    }));
  } catch (error) {
    console.error("Error processing date ranges:", error);
    return [];
  }
};

/**
 * Process itinerary data
 */
export const processItineraryData = (itinerary: any) => {
  try {
    const parsed = parseJsonField(itinerary, []);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed.map((item: any) => ({
      day: item.day || '',
      title: item.title || '',
      description: item.description || '',
      date: item.date ? new Date(item.date) : undefined
    }));
  } catch (error) {
    console.error("Error processing itinerary data:", error);
    return [];
  }
};

/**
 * Process facts data with special handling for different field types
 */
export const processFactsData = (facts: any) => {
  try {
    const parsed = parseJsonField(facts, []);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed.map((fact: any) => {
      let factValue = fact.value;
      
      // Handle stringified arrays and objects
      if (typeof factValue === 'string' && (factValue.startsWith('[') || factValue.startsWith('{'))) {
        try {
          factValue = JSON.parse(factValue);
        } catch (e) {
          console.warn('Could not parse fact value:', factValue);
        }
      }
      
      // Ensure proper structure based on field type
      if (fact.field_type === 'Multi Select' && !Array.isArray(factValue)) {
        factValue = factValue ? [factValue] : [];
      } else if (fact.field_type === 'Plain Text' && Array.isArray(factValue)) {
        factValue = factValue.length > 0 ? factValue[0] : '';
      }
      
      // Set defaults for empty values
      if (!factValue || (Array.isArray(factValue) && factValue.length === 0)) {
        if (fact.field_type === 'Plain Text') {
          factValue = '';
        } else {
          factValue = [];
        }
      }
      
      return {
        title: fact.title || '',
        field_type: fact.field_type || 'Plain Text',
        value: factValue,
        icon: fact.icon || ''
      };
    });
  } catch (error) {
    console.error("Error processing facts data:", error);
    return [];
  }
};

/**
 * Process FAQs data
 */
export const processFaqsData = (faqs: any) => {
  try {
    const parsed = parseJsonField(faqs, []);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed.map((faq: any) => ({
      question: faq.question || '',
      answer: faq.answer || ''
    }));
  } catch (error) {
    console.error("Error processing FAQs data:", error);
    return [];
  }
};

/**
 * Process gallery data
 */
export const processGalleryData = (gallery: any) => {
  try {
    const parsed = parseJsonField(gallery, []);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed.map((item: any) => ({
      image: item.image || item.url || ''
    }));
  } catch (error) {
    console.error("Error processing gallery data:", error);
    return [];
  }
};

/**
 * Process location data
 */
export const processLocationData = (location: any) => {
  try {
    const parsed = parseJsonField(location);
    
    if (!parsed) return undefined;
    
    // Validate required fields
    const requiredFields = ['street', 'city', 'state', 'country', 'lat', 'lng'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    
    if (missingFields.length > 0) {
      console.warn(`Missing required location fields: ${missingFields.join(', ')}`);
    }
    
    return {
      street: String(parsed.street || ''),
      city: String(parsed.city || ''),
      state: String(parsed.state || ''),
      country: String(parsed.country || ''),
      lat: safeToNumber(parsed.lat),
      lng: safeToNumber(parsed.lng),
      map: String(parsed.map || ''),
      zip: String(parsed.zip || '')
    };
  } catch (error) {
    console.error("Error processing location data:", error);
    return undefined;
  }
};

/**
 * Process tour dates data
 */
export const processTourDatesData = (tourDates: any) => {
  try {
    const parsed = parseJsonField(tourDates);
    
    if (!parsed) return undefined;
    
    return {
      days: safeToNumber(parsed.days),
      nights: safeToNumber(parsed.nights),
      scheduleType: parsed.scheduleType || 'flexible',
      defaultDateRange: parsed.defaultDateRange ? {
        from: new Date(parsed.defaultDateRange.from),
        to: new Date(parsed.defaultDateRange.to)
      } : undefined,
      departures: Array.isArray(parsed.departures) ? parsed.departures : []
    };
  } catch (error) {
    console.error("Error processing tour dates data:", error);
    return undefined;
  }
};

/**
 * Extract and process all tour fields from request body
 */
export const extractTourFields = (req: any) => {
  const {
    title, code, excerpt, description, coverImage, file, tourStatus,
    price, originalPrice, basePrice, discountEnabled, discountDateRange, discountPrice,
    pricePerType, minSize, maxSize, pricingOptionsEnabled, pricingOptions,
    fixedDeparture, multipleDates, tourDates, fixedDate, dateRanges,
    category, outline, itinerary, include, exclude, facts, faqs,
    gallery, map, location, author, enquiry, isSpecialOffer,
    destination, groupSize, pricing, dates, ...rest
  } = req.body;

  // Check if pricing is per person or per group
  const pricingData = pricing || {};
  const isPerPerson = pricingData.pricePerPerson !== false; // Default to true if not specified

  // Extract nested pricing data if it exists
  const nestedPricing = pricingData || {};
  const finalPricingOptions = pricingOptions || nestedPricing.pricingOptions;
  const finalDiscountEnabled = discountEnabled !== undefined ? discountEnabled : nestedPricing.discount?.discountEnabled;
  const finalDiscountPrice = discountPrice || nestedPricing.discount?.discountPrice;
  const finalDiscountDateRange = discountDateRange || nestedPricing.discount?.discountDateRange;
  const finalPricingOptionsEnabled = pricingOptionsEnabled !== undefined ? pricingOptionsEnabled : nestedPricing.pricingOptionsEnabled;

  return {
    // Basic fields
    title, code, excerpt, description, coverImage, file, tourStatus,
    
    // Pricing fields (flat structure to match database schema)
    price: safeToNumber(price),
    originalPrice: originalPrice ? safeToNumber(originalPrice) : undefined,
    basePrice: basePrice ? safeToNumber(basePrice) : undefined,
    pricePerPerson: isPerPerson,
    minSize: safeToNumber(minSize, 1),
    maxSize: safeToNumber(maxSize, 10),
    
    // Discount fields (flat structure)
    discountEnabled: convertToBoolean(finalDiscountEnabled),
    discountPrice: finalDiscountPrice ? safeToNumber(finalDiscountPrice) : undefined,
    discountDateRange: finalDiscountDateRange ? {
      from: new Date(finalDiscountDateRange.from),
      to: new Date(finalDiscountDateRange.to)
    } : undefined,
    
    // Pricing options (flat structure)
    pricingOptionsEnabled: convertToBoolean(finalPricingOptionsEnabled),
    pricingOptions: finalPricingOptions ? processPricingOptions(finalPricingOptions) : undefined,
    
    // Dates
    fixedDeparture: convertToBoolean(fixedDeparture),
    multipleDates: convertToBoolean(multipleDates),
    tourDates: tourDates ? processTourDatesData(tourDates) : undefined,
    dateRanges: dateRanges ? processDateRanges(dateRanges) : undefined,
    
    // Content fields
    category: category ? processCategoryData(category) : undefined,
    outline,
    itinerary: itinerary ? processItineraryData(itinerary) : undefined,
    include: Array.isArray(include) ? include : (include ? [include] : []),
    exclude: Array.isArray(exclude) ? exclude : (exclude ? [exclude] : []),
    facts: facts ? processFactsData(facts) : undefined,
    faqs: faqs ? processFaqsData(faqs) : undefined,
    gallery: gallery ? processGalleryData(gallery) : undefined,
    location: location ? processLocationData(location) : undefined,
    
    // Other fields
    author,
    enquiry: convertToBoolean(enquiry),
    isSpecialOffer: convertToBoolean(isSpecialOffer),
    destination,
    // Only set groupSize when pricing is per group (pricePerPerson = false)
    ...(isPerPerson ? {} : { groupSize: safeToNumber(groupSize, 1) }),
    
    // Any remaining fields
    ...rest
  };
};
