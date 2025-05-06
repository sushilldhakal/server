import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import tourModel from './tourModel';
import { User } from '../user/userTypes';
import { default as userModel } from '../user/userModel';
import cloudinary from '../../config/cloudinary';
import { AuthRequest } from "../../middlewares/authenticate";
import mongoose from 'mongoose';
import { FactValue } from './tourTypes';
import { paginate, PaginationParams } from '../../utils/pagination';

// Helper functions for handling common data types
const convertToBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const parseJsonField = <T>(jsonString: string | any, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  if (typeof jsonString !== 'string') return jsonString;
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error parsing JSON field:", e);
    return defaultValue;
  }
};

interface DateRange {
  from?: Date;
  to?: Date;
  startDate?: Date;
  endDate?: Date;
}

const ensureDateRange = (dateRange: DateRange | any): { from: Date; to: Date } => {
  if (!dateRange) return { from: new Date(), to: new Date() };
  
  return {
    from: dateRange.from ? new Date(dateRange.from) : 
          dateRange.startDate ? new Date(dateRange.startDate) : new Date(),
    to: dateRange.to ? new Date(dateRange.to) : 
        dateRange.endDate ? new Date(dateRange.endDate) : new Date()
  };
};

// Create a tour
export const createTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.log("req.body", req.body);
  try {
    // Cast req to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    const {
      title,
      code,
      excerpt,
      description,
      tourStatus,
      basePrice,
      price,
      pricePerType,
      minSize,
      maxSize,
      groupSize,
      pricingOptionsEnabled,
      fixedDeparture,
      multipleDates,
      isSpecialOffer,
      outline,
      include,
      exclude,
      destination,
      map,
      coverImage,
      author,
      enquiry,
      category,
      itinerary,
      facts,
      faqs,
      gallery,
      location,
      originalPrice,
      discountEnabled,
      discountPrice,
      discountDateRange,
      // Pricing structure fields
      pricingOptions,
      // Tour dates fields
      tourDates,
      fixedDate,
      dateRanges
    } = req.body;

    // Validate required fields
    if (!title || !code) {
      return next(
        createHttpError(400, "Title and code are required fields")
      );
    }

    // Process category data
    let processedCategory: Array<{categoryId: mongoose.Types.ObjectId, categoryName: string}> = [];
    if (Array.isArray(category)) {
      processedCategory = category.map((cat: any) => {
        if (cat && cat.value) {
          return {
            categoryId: new mongoose.Types.ObjectId(cat.value),
            categoryName: cat.label || 'Category'
          };
        }
        return null;
      }).filter(Boolean) as Array<{categoryId: mongoose.Types.ObjectId, categoryName: string}>;
    }

    // Process itinerary data
    let processedItinerary: Array<{
      day: string;
      title: string;
      description: string;
      dateTime: Date;
    }> = [];
    if (Array.isArray(itinerary)) {
      processedItinerary = itinerary.map(item => ({
        ...item,
        day: item.day || '1',
        title: item.title || '',
        description: item.description || '',
        dateTime: item.dateTime || new Date()
      }));
    }

    // Parse pricingOptions field
    interface PricingOption {
      name: string;
      category: string;
      customCategory: string;
      price: number;
      discountEnabled: boolean;
      discountPrice: number;
      discountDateRange: DateRange;
      paxRange: {
        from: number;
        to: number;
      };
    }

    let parsedPricingOptions: PricingOption[] = [];
    if (req.body.pricingOptions) {
      try {
        const pricingOptionsData = parseJsonField<Record<string, any>[]>(req.body.pricingOptions, []);
        
        // Map between field names in frontend and backend
        parsedPricingOptions = pricingOptionsData.map(option => ({
          name: option.name || option.optionName || '',
          category: option.category || 'adult',
          customCategory: option.customCategory || '',
          price: parseFloat(String(option.price || option.optionPrice || 0)),
          discountEnabled: convertToBoolean(option.discountEnabled),
          discountPrice: parseFloat(String(option.discountPrice || 0)),
          discountDateRange: ensureDateRange(option.discountDateRange || {}),
          paxRange: Array.isArray(option.paxRange) ? {
            from: parseInt(String(option.paxRange[0] || 1)),
            to: parseInt(String(option.paxRange[1] || 10))
          } : { from: 1, to: 10 }
        }));
      } catch (error) {
        console.error("Error processing pricingOptions:", error);
        parsedPricingOptions = [];
      }
    }

    // Process date ranges
    let processedDateRanges: Array<{
      id: string;
      label: string;
      dateRange: { from: Date; to: Date };
      selectedPricingOptions: string[];
      isRecurring: boolean;
      recurrencePattern: string;
      recurrenceEndDate: Date | null;
    }> = [];
    if (Array.isArray(dateRanges)) {
      processedDateRanges = dateRanges.map(range => ({
        id: range.id || String(new Date().getTime()),
        label: range.label || 'Date Range',
        dateRange: range.dateRange || { from: new Date(), to: new Date() },
        selectedPricingOptions: Array.isArray(range.selectedPricingOptions) ? range.selectedPricingOptions : [],
        isRecurring: range.isRecurring === true,
        recurrencePattern: range.recurrencePattern || null,
        recurrenceEndDate: range.recurrenceEndDate ? new Date(range.recurrenceEndDate) : null
      }));
    }

    // Parse fixedDate field
    let parsedFixedDate;
    if (req.body.fixedDate) {
      const fixedDateData = parseJsonField<Record<string, any>>(req.body.fixedDate, {
        dateRange: { from: new Date(), to: new Date() },
        selectedPricingOption: null
      });
      
      parsedFixedDate = {
        dateRange: ensureDateRange(fixedDateData.dateRange || {}),
        selectedPricingOption: fixedDateData.selectedPricingOption || null
      };
    } else {
      // Default values for fixedDate
      parsedFixedDate = {
        dateRange: { from: new Date(), to: new Date() },
        selectedPricingOption: null
      };
    }

    // Parse tourDates field
    let parsedTourDates;
    if (req.body.tourDates) {
      const tourDatesData = parseJsonField<Record<string, any>>(req.body.tourDates, {
        days: 1,
        nights: 0,
        dateRange: { from: new Date(), to: new Date() },
        isRecurring: false,
        recurrencePattern: null,
        recurrenceEndDate: null,
        priceLockedUntil: null
      });
      
      parsedTourDates = {
        days: parseInt(String(tourDatesData.days || 1)),
        nights: parseInt(String(tourDatesData.nights || 0)),
        dateRange: ensureDateRange(tourDatesData.dateRange || {}),
        isRecurring: convertToBoolean(tourDatesData.isRecurring),
        recurrencePattern: tourDatesData.recurrencePattern || null,
        recurrenceEndDate: tourDatesData.recurrenceEndDate ? new Date(tourDatesData.recurrenceEndDate) : null,
        priceLockedUntil: tourDatesData.priceLockedUntil ? new Date(tourDatesData.priceLockedUntil) : null
      };
    } else {
      // Default values for tourDates
      parsedTourDates = {
        days: 1,
        nights: 0,
        dateRange: { from: new Date(), to: new Date() },
        isRecurring: false,
        recurrencePattern: null,
        recurrenceEndDate: null,
        priceLockedUntil: null
      };
    }

    // Process discount fields
    const isDiscountEnabled = convertToBoolean(req.body.discountEnabled);
    const discountPriceValue = req.body.discountPrice ? parseFloat(String(req.body.discountPrice)) : 0;
    
    // Process discount date range
    let parsedDiscountDateRange = {
      from: new Date(),
      to: new Date()
    };
    
    try {
      // Handle discountDateRange if provided
      if (req.body.discountDateRange) {
        const parsedRange = parseJsonField<Record<string, any>>(req.body.discountDateRange, {});
        parsedDiscountDateRange = ensureDateRange(parsedRange);
      }
    } catch (error) {
      console.error("Error parsing discount date range:", error);
    }
    
    // Create structured discount object
    const discountObject = isDiscountEnabled ? {
      discountEnabled: true,
      discountPrice: discountPriceValue,
      discountDateRange: parsedDiscountDateRange
    } : {
      discountEnabled: false
    };
    
    // Create a new tour
    const newTour = new tourModel({
      title,
      code: code.toUpperCase(),
      excerpt: excerpt || title,
      description,
      author: authReq.user?._id || authReq.userId,
      tourStatus: tourStatus || "Draft",
      price: Array.isArray(price) ? parseFloat(price[0]) || 0 : parseFloat(price) || 0,
      coverImage,
      outline,
      include,
      exclude,
      map,
      enquiry: convertToBoolean(enquiry),
      isSpecialOffer: convertToBoolean(isSpecialOffer),
      // New pricing structure fields
      basePrice: parseFloat(basePrice) || 0,
      discountEnabled: isDiscountEnabled,
      discountPrice: discountPriceValue,
      pricePerType: pricePerType || 'person',
      minSize: parseInt(minSize) || 1,
      maxSize: parseInt(maxSize) || 10,
      groupSize: parseInt(groupSize) || 1,
      pricingOptionsEnabled: convertToBoolean(pricingOptionsEnabled),
      pricingOptions: parsedPricingOptions,
      // Tour dates fields
      fixedDeparture: convertToBoolean(fixedDeparture),
      multipleDates: convertToBoolean(multipleDates),
      tourDates: parsedTourDates || { 
        days: 0,
        nights: 0,
        dateRange: {
          from: new Date(),
          to: new Date()
        },
        isRecurring: false
      },
      // Pass the parsed discount date range directly
      discountDateRange: parsedDiscountDateRange,
      // Add the structured discount object
      discount: discountObject
    });

    // Only add destination if it's a valid non-empty string
    if (destination && typeof destination === 'string' && destination.trim() !== '') {
      newTour.destination = new mongoose.Types.ObjectId(destination);
    } else if (destination && destination._id) {
      newTour.destination = new mongoose.Types.ObjectId(destination._id);
    }

    // Save the tour
    const savedTour = await newTour.save();
    res.status(201).json({ tour: savedTour });
  } catch (err: any) {
    console.error("Failed to create tour:", err);
    next(createHttpError(500, `Failed to create tour: ${err.message}`));
  }
};


// Update a tour
export const updateTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.log("req.body", req.body);
  try {
    // Cast req to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;
    const tourId = req.params.tourId; // Changed from req.params.id to req.params.tourId
      
    // Initialize empty updates object - we'll only add fields that are explicitly provided
    const updates: any = {};
      
    // List of all possible fields from the request body
    const {
      title,
      code,
      excerpt,
      description,
      coverImage,
      tourStatus,
      price,
      originalPrice,
      // Pricing structure fields
      basePrice,
      discountEnabled,
      discountDateRange,
      discountPrice,
      pricePerType,
      minSize,
      maxSize,
      pricingOptionsEnabled,
      pricingOptions,
      // Tour dates fields
      fixedDeparture,
      multipleDates,
      tourDates,
      fixedDate,
      dateRanges,
      // Other fields
      category,
      outline,
      itinerary,
      include,
      exclude,
      facts,
      faqs,
      gallery,
      map,
      location,
      author,
      enquiry,
      isSpecialOffer,
      destination,
      groupSize,
    } = req.body;

    // Only add fields to updates if they are explicitly provided in the request
      
    // Handle basic string fields
    if (title !== undefined) updates.title = title;
    if (code !== undefined) updates.code = code;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (description !== undefined) updates.description = description;
    if (tourStatus !== undefined) updates.tourStatus = tourStatus;
    if (outline !== undefined) updates.outline = outline;
    if (include !== undefined) updates.include = include;
    if (exclude !== undefined) updates.exclude = exclude;
    if (map !== undefined) updates.map = map;
      
    // Handle numerical values - only if they exist in the request
    if (price !== undefined) {
      // Handle price being an array or string
      if (Array.isArray(price)) {
        updates.price = parseFloat(price[0]) || 0;
      } else {
        updates.price = parseFloat(price as string) || 0;
      }
    }
    if (originalPrice !== undefined) updates.originalPrice = parseFloat(originalPrice as string) || 0;
    if (basePrice !== undefined) updates.basePrice = parseFloat(basePrice as string) || 0;
    if (minSize !== undefined) updates.minSize = parseInt(minSize as string) || 1;
    if (maxSize !== undefined) updates.maxSize = parseInt(maxSize as string) || 10;
    if (groupSize !== undefined) updates.groupSize = parseInt(groupSize as string) || 1;

    // Handle boolean values - only if they exist in the request
    if (pricingOptionsEnabled !== undefined) updates.pricingOptionsEnabled = convertToBoolean(pricingOptionsEnabled);
    if (fixedDeparture !== undefined) updates.fixedDeparture = convertToBoolean(fixedDeparture);
    if (multipleDates !== undefined) updates.multipleDates = convertToBoolean(multipleDates);
    if (enquiry !== undefined) updates.enquiry = convertToBoolean(enquiry);
    if (isSpecialOffer !== undefined) updates.isSpecialOffer = convertToBoolean(isSpecialOffer);
      
    // Handle string values - only if they exist in the request
    if (pricePerType !== undefined) updates.pricePerType = pricePerType;
      
    // Handle cover image - only if it exists in the request
    if (coverImage) updates.coverImage = coverImage;
    if (req.file?.path) updates.coverImage = req.file.path;
      
    // Handle category - only if it exists in the request
    if (category) {
      try {
        // Handle the array of objects with label and value properties
        updates.category = Array.isArray(category) ? category.map((cat: any) => {
          if (cat && cat.value) {
            return {
              categoryId: new mongoose.Types.ObjectId(cat.value),
              categoryName: cat.label || 'Category'
            };
          }
          return {
            categoryId: new mongoose.Types.ObjectId(),
            categoryName: 'Category'
          };
        }) : [];
      } catch (error) {
        console.error("Error processing category:", error);
        // Don't update category if there's an error
      }
    }
    
    // Handle itinerary
    if (itinerary) {
      try {
        // Process itinerary data
        updates.itinerary = Array.isArray(itinerary) ? itinerary.map((item: any) => ({
          ...item,
          day: item.day || '1',
          title: item.title || '',
          description: item.description || '',
          dateTime: item.dateTime || new Date()
        })) : [];
      } catch (error) {
        console.error("Error processing itinerary:", error);
        // Don't update itinerary if there's an error
      }
    }
    
    // Parse pricingOptions field
    interface PricingOption {
      name: string;
      category: string;
      customCategory: string;
      price: number;
      discountEnabled: boolean;
      discountPrice: number;
      discountDateRange: DateRange;
      paxRange: {
        from: number;
        to: number;
      };
    }

    let parsedPricingOptions: PricingOption[] = [];
    if (req.body.pricingOptionsEnabled === true || req.body.pricingOptionsEnabled === "true") {
      let pricingArray;
      try {
        pricingArray = typeof pricingOptions === 'string' ? JSON.parse(pricingOptions) : pricingOptions;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid pricingOptions format' });
      }
      parsedPricingOptions = pricingArray.map((option: any) => {
        // Create the pricing option with the correct structure
        return {
          name: option.name,
          category: option.category || 'adult',
          customCategory: option.customCategory || '',
          price: Number(option.price) || 0,
          // Handle discount fields directly in the pricing option
          discountEnabled: option.discountEnabled === true || option.discountEnabled === 'true',
          discountPrice: option.discountEnabled ? Number(option.discountPrice) || 0 : 0,
          discountDateRange: {
            from: option.discountEnabled && option.discountDateRange?.from ? 
              new Date(option.discountDateRange.from) : new Date(),
            to: option.discountEnabled && option.discountDateRange?.to ? 
              new Date(option.discountDateRange.to) : new Date()
          },
          // Parse paxRange correctly
          paxRange: {
            from: Array.isArray(option.paxRange) ? Number(option.paxRange[0]) || 1 : 
                  (option.paxRange?.from ? Number(option.paxRange.from) : 1),
            to: Array.isArray(option.paxRange) ? Number(option.paxRange[1]) || 10 : 
                (option.paxRange?.to ? Number(option.paxRange.to) : 10)
          }
        };
      });
    }
    updates.pricingOptions = parsedPricingOptions;

    // Handle dateRanges if it exists
    if (dateRanges) {
      try {
        // Parse dateRanges from JSON
        const parsedDateRanges = typeof dateRanges === 'string' 
          ? JSON.parse(dateRanges) 
          : dateRanges;
        
        console.log("Parsing dateRanges:", parsedDateRanges);
        
        // Process and validate each date range
        updates.dateRanges = parsedDateRanges.map((range: any) => {
          // Prepare base object
          const processedRange: any = {
            label: range.label || 'Date Range',
            dateRange: ensureDateRange(range.dateRange || {}),
            isRecurring: Boolean(range.isRecurring),
          };
          
          // Handle selectedPricingOptions - can be strings or objects
          if (range.selectedPricingOptions) {
            if (Array.isArray(range.selectedPricingOptions)) {
              processedRange.selectedPricingOptions = range.selectedPricingOptions.map((option: any) => {
                // If option is already an object with all required fields, use it as is
                if (typeof option === 'object' && option.id && option.name) {
                  return {
                    id: option.id,
                    name: option.name,
                    category: option.category || '',
                    price: Number(option.price) || 0
                  };
                }
                // If option is just a string (legacy format), return it as is
                return option;
              });
            } else {
              // Ensure it's always an array
              processedRange.selectedPricingOptions = [];
            }
          } else {
            processedRange.selectedPricingOptions = [];
          }
          
          // Only add recurrence fields if isRecurring is true or they exist
          if (processedRange.isRecurring) {
            processedRange.recurrencePattern = range.recurrencePattern || undefined;
            processedRange.recurrenceEndDate = range.recurrenceEndDate ? new Date(range.recurrenceEndDate) : undefined;
          }
          
          // Add priceLockedUntil if provided
          if (range.priceLockedUntil) {
            processedRange.priceLockedUntil = new Date(range.priceLockedUntil);
          }
          
          return processedRange;
        });
        
        console.log("Processed dateRanges:", updates.dateRanges);
      } catch (error) {
        console.error("Error processing dateRanges:", error);
        delete updates.dateRanges;
      }
    }

    // Ensure the date ranges are properly handled in tourDates
    if (tourDates) {
      try {
        // Parse the tourDates JSON string
        const parsedTourDates = typeof tourDates === 'string' 
          ? JSON.parse(tourDates) 
          : tourDates;
        
        console.log("Parsed tourDates:", parsedTourDates);
        
        // Create a properly structured tourDates object
        updates.tourDates = {
          days: parseInt(String(parsedTourDates.days || 0)),
          nights: parseInt(String(parsedTourDates.nights || 0)),
        };
        
        // Handle the dateRange if it exists
        if (parsedTourDates.dateRange) {
          updates.tourDates.dateRange = ensureDateRange(parsedTourDates.dateRange);
        }
        
        console.log("Processed tourDates:", updates.tourDates);
      } catch (error) {
        console.error("Error processing tourDates:", error);
        delete updates.tourDates; // Don't fail the whole update, just this field
      }
    }

    // Handle fixedDate if it exists
    if (fixedDate) {
      try {
        const parsedFixedDate = typeof fixedDate === 'string'
          ? JSON.parse(fixedDate)
          : fixedDate;
          
        updates.fixedDate = {
          dateRange: ensureDateRange(parsedFixedDate.dateRange || {})
        };
      } catch (error) {
        console.error("Error processing fixedDate:", error);
      }
    }

    // Handle other complex objects
    if (outline) updates.outline = outline;
    if (include) updates.include = include;
    if (exclude) updates.exclude = exclude;
    
    // Handle other JSON fields
    if (facts) {
      try {
        // Parse facts if needed
        let factsArray = Array.isArray(facts) ? facts : 
                      (typeof facts === 'string' ? JSON.parse(facts) : []);
        
        // Define fact interface to fix TypeScript errors
        interface FactItem {
          title: string;
          field_type: string;
          value: any; // can be array of strings or array of objects
          icon: string;
        }
        
        // Process each fact to fix nested arrays and stringified objects
        updates.facts = factsArray.map((fact: FactItem) => {
          // Extract value and normalize it
          let factValue = fact.value;
          
          // Fix double-nested arrays
          if (Array.isArray(factValue) && factValue.length === 1 && Array.isArray(factValue[0])) {
            factValue = factValue[0];
          }
          
          // Special handling for Multi Select with JSON string
          if (fact.field_type === 'Multi Select') {
            // For Multi Select fields, the value might be a JSON string itself
            if (Array.isArray(factValue) && factValue.length === 1 && typeof factValue[0] === 'string' && factValue[0].startsWith('[')) {
              try {
                // Parse the JSON string to get actual objects
                factValue = JSON.parse(factValue[0]);
              } catch (e) {
                console.error("Error parsing Multi Select JSON string:", e);
                factValue = [];
              }
            } else if (typeof factValue === 'string' && factValue.startsWith('[')) {
              try {
                factValue = JSON.parse(factValue);
              } catch (e) {
                console.error("Error parsing direct JSON string:", e);
                factValue = [];
              }
            }
          }
          
          // Default value handling
          if (!factValue || (Array.isArray(factValue) && factValue.length === 0)) {
            if (fact.field_type === 'Plain Text') {
              factValue = [''];
            } else if (fact.field_type === 'Single Select') {
              factValue = [''];
            } else if (fact.field_type === 'Multi Select') {
              factValue = [];
            }
          }
          
          return {
            ...fact,
            value: factValue
          };
        });
        
      } catch (error) {
        console.error("Error processing facts:", error);
        // Don't update facts if there's an error
      }
    }
    
    if (faqs) {
      try {
        // FAQs are already in the correct array format
        updates.faqs = Array.isArray(faqs) ? faqs : 
                     (typeof faqs === 'string' ? JSON.parse(faqs) : []);
      } catch (error) {
        console.error("Error processing faqs:", error);
        // Don't update faqs if there's an error
      }
    }
    
    if (gallery) {
      try {
        // Handle gallery array or single item
        updates.gallery = Array.isArray(gallery) ? gallery : 
                        (typeof gallery === 'string' ? JSON.parse(gallery) : [gallery]);
      } catch (error) {
        console.error("Error processing gallery:", error);
        // Don't update gallery if there's an error
      }
    }
    
    if (location) {
      try {
        // Parse the location if it's a string
        const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
        
        // Validate that all required fields exist
        const requiredFields = ['street', 'city', 'state', 'country', 'lat', 'lng'];
        const missingFields = requiredFields.filter(field => !parsedLocation[field]);
        
        if (missingFields.length > 0) {
          console.warn(`Location is missing required fields: ${missingFields.join(', ')}`);
          
          // If there are missing fields, we can either:
          // 1. Return an error (strict validation)
          // 2. Try to use defaults (more permissive)
          // Using option 2 for better user experience:
          
          // Create a complete location object with defaults for missing fields
          updates.location = {
            street: parsedLocation.street || '',
            city: parsedLocation.city || '',
            state: parsedLocation.state || '',
            country: parsedLocation.country || '',
            lat: typeof parsedLocation.lat === 'number' ? parsedLocation.lat : 0,
            lng: typeof parsedLocation.lng === 'number' ? parsedLocation.lng : 0,
            // Add any existing fields that aren't in the required list
            ...Object.fromEntries(
              Object.entries(parsedLocation).filter(([key]) => !requiredFields.includes(key))
            )
          };
        } else {
          // All required fields exist, but ensure they have the right types
          updates.location = {
            street: String(parsedLocation.street),
            city: String(parsedLocation.city),
            state: String(parsedLocation.state),
            country: String(parsedLocation.country),
            lat: Number(parsedLocation.lat),
            lng: Number(parsedLocation.lng),
            // Add any existing fields that aren't in the required list
            ...Object.fromEntries(
              Object.entries(parsedLocation).filter(([key]) => !requiredFields.includes(key))
            )
          };
        }
        
        console.log("Processed location:", updates.location);
      } catch (error) {
        console.error("Error processing location:", error);
        // Don't update location if there's an error
      }
    }

    // Process discount information - only if any discount-related fields are provided
    if (discountEnabled !== undefined || discountPrice !== undefined || discountDateRange !== undefined) {
      const discount: {
        discountEnabled: boolean;
        discountPrice?: number;
        discountDateRange?: {
          from: Date;
          to: Date;
        };
      } = {
        discountEnabled: discountEnabled === 'true' || discountEnabled === true,
      };
      
      // Only add these fields if they're provided
      if (discount.discountEnabled) {
        if (discountPrice !== undefined) {
          discount.discountPrice = Number(discountPrice);
        }

        if (discountDateRange !== undefined) {
          try {
            const parsedRange =
              typeof discountDateRange === 'string'
                ? JSON.parse(discountDateRange)
                : discountDateRange;

            discount.discountDateRange = {
              from: new Date(parsedRange.from),
              to: new Date(parsedRange.to),
            };
          } catch (error) {
            return res.status(400).json({ error: 'Invalid discountDateRange format' });
          }
        }
      }
      
      // Only add discount field if we have valid data
      updates.discount = discount;
    }
    
    // Handle destination - only if it's provided
    if (destination !== undefined) {
      // Only add destination if it's a valid non-empty string
      if (typeof destination === 'string' && destination.trim() !== '') {
        updates.destination = new mongoose.Types.ObjectId(destination);
      } else if (destination && destination._id) {
        updates.destination = new mongoose.Types.ObjectId(destination._id);
      }
    }

    // Check if updates is empty (no fields to update)
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Log the updates being applied
    console.log("Applying updates:", Object.keys(updates));

    // Find the tour
    const tour = await tourModel.findById(tourId);
    if (!tour) {
      return next(createHttpError(404, "Tour not found"));
    }

    // Check if the user is authorized to update this tour
    if (tour.author && Array.isArray(tour.author) && tour.author.length > 0) {
      const authorIds = tour.author.map((id: mongoose.Types.ObjectId) => id.toString());
      if (userId && !authorIds.includes(userId.toString())) {
        return next(createHttpError(403, "Not authorized to update this tour"));
      }
    }

    // Update the tour - only updating the fields that were provided
    const updatedTour = await tourModel.findByIdAndUpdate(
      tourId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      tour: updatedTour,
      message: "Tour updated successfully",
      updatedFields: Object.keys(updates)
    });
  } catch (err: any) {
    console.error("Failed to update tour:", err);
    next(createHttpError(500, `Failed to update tour: ${err.message}`));
  }
};

// Get all tours
export const getAllTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract pagination parameters from query
    const paginationParams: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: req.query.sortBy as string || 'updatedAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      search: req.query.search as string
    };


    // Build query to filter tours
    const query: any = {};
    
    // Filter by tour status if provided, otherwise default to 'published'
    // Use case-insensitive regex to match status regardless of case
    const tourStatus = req.query.tourStatus as string || 'Published';
    if (tourStatus) {
      query.tourStatus = { $regex: new RegExp(`^${tourStatus}$`, 'i') };
    }
    
    // Add any additional filters from query params
    if (req.query.category) {
      query['category.categoryId'] = req.query.category;
    }
    

    // Check what tour statuses exist in the database
    const distinctStatuses = await tourModel.distinct('tourStatus');
    
    // Count total tours with this status
    const totalToursWithStatus = await tourModel.countDocuments(query);

    // Use the paginate utility with the query to get filtered tours
    const result = await paginate(tourModel, query, paginationParams);
    // Populate author information for each tour
    if (result.items.length > 0) {
      await tourModel.populate(result.items, { path: 'author', select: 'name' });
    }


    // Return tours with pagination info
    res.status(200).json({
      tours: result.items,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalTours: result.totalItems,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1
      }
    });
  } catch (err) {
    console.error("Error in getAllTours:", err);
    next(createHttpError(500, 'Failed to get tours'));
  }
};

// Get user tours
export const getUserTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast to AuthRequest to access user properties
    const authReq = req as AuthRequest;
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Base query
    let query = tourModel.find();

    // Apply role-based filtering
    if (authReq.roles !== 'admin') {
      query = query.find({ author: authReq.userId });
    }

    // Get total count for pagination
    const totalTours = await tourModel.countDocuments(
      authReq.roles === 'admin' ? {} : { author: authReq.userId }
    );

    // Apply pagination and populate
    const tours = await query
      .populate("author", "name email roles")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTours / limit),
          totalItems: totalTours,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error('Error in getUserTours:', err);
    next(createHttpError(500, 'Failed to get tours'));
  }
};


export const getUserToursTitle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const tours = await tourModel
      .find({ author: userId })
      .select('title')
      .lean();
    res.status(200).json({ success: true, data: tours });
  } catch (err) {
    console.error('Error in getUserToursTitle:', err);
    next(createHttpError(500, 'Failed to get tours'));
  }
};

// Get a single tour
export const getTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tourId = req.params.tourId;
  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }

  try {
      const tour = await tourModel
          .findOne({ _id: tourId })
          // populate author field
          .populate('author', 'name email roles')
          .populate('reviews.user', 'name email roles');
          
      if (!tour) {
          return next(createHttpError(404, "tour not found."));
      }

      // Create a modified version of tour with fixed fact values for the response
      const sanitizedTour = tour.toObject();
      
      // Fix the nested arrays and stringified objects in facts
      if (sanitizedTour.facts && Array.isArray(sanitizedTour.facts)) {
        sanitizedTour.facts = sanitizedTour.facts.map((fact: any) => {
          // Fix double-nested arrays
          let factValue = fact.value;
          
          // If it's a double-nested array, flatten it
          if (Array.isArray(factValue) && factValue.length === 1 && Array.isArray(factValue[0])) {
            factValue = factValue[0];
          }
          
          // Handle Multi Select JSON strings
          if (fact.field_type === 'Multi Select') {
            // If the value is a string that looks like JSON, parse it
            if (Array.isArray(factValue) && factValue.length === 1 && typeof factValue[0] === 'string' && factValue[0].startsWith('[')) {
              try {
                factValue = JSON.parse(factValue[0]);
              } catch (e) {
                console.error("Error parsing Multi Select JSON string in getTour:", e);
                factValue = [];
              }
            } else if (typeof factValue === 'string' && factValue.startsWith('[')) {
              try {
                factValue = JSON.parse(factValue);
              } catch (e) {
                console.error("Error parsing direct JSON string in getTour:", e);
                factValue = [];
              }
            }
          }
          
          return {
            ...fact,
            value: factValue
          };
        });
      }
      
      const breadcrumbs = [
        {
          label: sanitizedTour.title, // Use tour title for breadcrumb label
          url: `/tours/${sanitizedTour._id}`, // URL to the tour
        },
      ];
      
      res.status(200).json({ tour: sanitizedTour, breadcrumbs });
  } catch (err) {
      next(createHttpError(500, "Error while getting the tour."));
  }
};



// Delete a tour
export const deleteTour = async (req: Request, res: Response, next: NextFunction) => {
  const tourId = req.params.tourId;

  if (!mongoose.Types.ObjectId.isValid(tourId)) {
    return res.status(400).json({ message: 'Invalid Tour ID' });
  }

  try {
    const tour = await tourModel.findByIdAndDelete(tourId);

    if (!tour) {
      return next(createHttpError(404, "Tour not found."));
    }

    res.status(200).json({ message: "Tour deleted successfully" });
  } catch (err: any) {
    next(createHttpError(500, "Error while deleting the tour."));
  }
};

// Get latest created tours
export const getLatestTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({ tourStatus: 'Published' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("author", "name roles");
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get latest tours'));
  }
};



// Get discounted tours
export const getDiscountedTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentDate = new Date();
    const { 
      limit = 10, 
      page = 1, 
      minDiscount = 0, 
      maxDiscount = 100,
      sortBy = 'percentage', // percentage, price, date
      sortOrder = 'desc' 
    } = req.query;
    
    // Convert query parameters to appropriate types
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const minDiscountNum = parseInt(minDiscount as string);
    const maxDiscountNum = parseInt(maxDiscount as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Build sort options
    const sortOptions: any = {};
    if (sortBy === 'percentage') {
      sortOptions['discount.percentage'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'price') {
      sortOptions['price'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'date') {
      sortOptions['updatedAt'] = sortOrder === 'asc' ? 1 : -1;
    }
    
    // Build query
    const query = {
      tourStatus: 'Published',
      'discount.isActive': true,
      'discount.startDate': { $lte: currentDate },
      'discount.endDate': { $gte: currentDate },
      'discount.percentage': { 
        $gte: minDiscountNum, 
        $lte: maxDiscountNum 
      }
    };
    
    // Get total count for pagination
    const totalCount = await tourModel.countDocuments(query);
    
    // Get tours with pagination
    const tours = await tourModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate("author", "name roles")
      .populate("category.categoryId", "name");
    
    // Calculate discounted prices for each tour
    const toursWithDiscountInfo = tours.map(tour => {
      const tourObject = tour.toJSON();
      return tourObject;
    });
    
    res.status(200).json({ 
      tours: toursWithDiscountInfo,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    next(createHttpError(500, 'Failed to get discounted tours'));
  }
};

// Get special offer tours
export const getSpecialOfferTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({
      tourStatus: 'Published',
      isSpecialOffer: true
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("author", "name roles");
    
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get special offer tours'));
  }
};

// Search for tours
export const searchTours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { keyword, destination, minPrice, maxPrice, rating } = req.query;
    
    // Build query
    const query: any = { tourStatus: 'Published' };
    
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { outline: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    if (destination) {
      query.destination = destination;
    }
    
    if (minPrice) {
      query.price = { $gte: parseFloat(minPrice as string) };
    }
    
    if (maxPrice) {
      if (query.price) {
        query.price.$lte = parseFloat(maxPrice as string);
      } else {
        query.price = { $lte: parseFloat(maxPrice as string) };
      }
    }
    
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating as string) };
    }
    
    const tours = await tourModel.find(query)
      .sort({ createdAt: -1 })
      .populate("author", "name roles");
      
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to search tours'));
  }
};


// Get tours by rating
export const getToursByRating = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tours = await tourModel.find({ tourStatus: 'Published', reviewCount: { $gt: 0 } })
      .sort({ averageRating: -1 })
      .limit(10)
      .populate("author", "name roles");
    res.status(200).json({ tours });
  } catch (err) {
    next(createHttpError(500, 'Failed to get top-rated tours'));
  }
};

// Increment tour view count
export const incrementTourViews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Increment the view counter
    const result = await tourModel.findByIdAndUpdate(
      tourId, 
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!result) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Tour view count incremented',
      data: {
        views: result.views
      }
    });
  } catch (err: any) {
    console.error('Error in incrementTourViews:', err);
    next(createHttpError(500, 'Failed to increment view count'));
  }
};

// Increment tour booking count
export const incrementTourBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tourId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return next(createHttpError(400, 'Invalid tour ID'));
    }

    // Increment the booking counter
    const result = await tourModel.findByIdAndUpdate(
      tourId, 
      { $inc: { bookingCount: 1 } },
      { new: true }
    );

    if (!result) {
      return next(createHttpError(404, 'Tour not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Tour booking count incremented',
      data: {
        bookingCount: result.bookingCount
      }
    });
  } catch (err: any) {
    console.error('Error in incrementTourBookings:', err);
    next(createHttpError(500, 'Failed to increment booking count'));
  }
};
