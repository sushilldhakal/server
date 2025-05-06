// import { Request, Response, NextFunction } from 'express';
// import mongoose from 'mongoose';
// import { discountSchema, pricingOptionSchema, dateRangeSchema, pricingGroupSchema, 
//   // fixedDepartureSchema 
// } from './tourModel';

// /**
//  * Get schema definitions for frontend use
//  * Provides the schema structure for pricing options, discounts, date ranges, etc.
//  */
// export const getSchemaDefinitions = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Extract just the paths (structure) from the schemas - not the validators, etc.
//     const schemas = {
//       pricingOption: getSchemaStructure(pricingOptionSchema),
//       discount: getSchemaStructure(discountSchema),
//       dateRange: getSchemaStructure(dateRangeSchema),
//       pricingGroup: getSchemaStructure(pricingGroupSchema),
//       // fixedDeparture: getSchemaStructure(fixedDepartureSchema)
//     };

//     res.status(200).json({
//       success: true,
//       data: schemas
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create a pricing option template for the frontend
//  * Returns an object with default values based on the schema
//  */
// export const getPricingOptionTemplate = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const template = {
//       name: '',
//       price: 0,
//       saleEnabled: false,
//       salePrice: 0,
//       paxRange: [1, 10] // Default min/max pax
//     };

//     res.status(200).json({
//       success: true,
//       data: template
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create a date range template for the frontend
//  * Returns an object with default values based on the schema
//  */
// export const getDateRangeTemplate = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const today = new Date();
//     const nextWeek = new Date();
//     nextWeek.setDate(today.getDate() + 7);
    
//     const template = {
//       label: 'New Date Range',
//       startDate: today,
//       endDate: nextWeek,
//       selectedOptions: []
//     };

//     res.status(200).json({
//     success: true,
//       data: template
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create a pricing group template for the frontend
//  * Returns an object with default values based on the schema
//  */
// export const getPricingGroupTemplate = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const today = new Date();
//     const nextWeek = new Date();
//     nextWeek.setDate(today.getDate() + 7);
    
//     const template = {
//       label: 'New Pricing Group',
//       options: [
//         {
//           name: 'Adult',
//           price: 100,
//           saleEnabled: false,
//           salePrice: 0,
//           paxRange: [1, 10]
//         }
//       ],
//       dateRanges: [
//         {
//           label: 'Default Date Range',
//           startDate: today,
//           endDate: nextWeek,
//           selectedOptions: ['Adult']
//         }
//       ]
//     };

//     res.status(200).json({
//       success: true,
//       data: template
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create a fixed departure template for the frontend
//  * Returns an object with default values based on the schema
//  */
// // export const getFixedDepartureTemplate = async (
// //   req: Request,
// //   res: Response,
// //   next: NextFunction
// // ) => {
// //   try {
// //     const today = new Date();
// //     const nextWeek = new Date();
// //     nextWeek.setDate(today.getDate() + 7);
    
// //     const template = {
// //       tourId: '',
// //       startDate: today,
// //       endDate: nextWeek,
// //       pricingCategory: 'standard',
// //       price: 0,
// //       discountPrice: 0,
// //       isDiscounted: false,
// //       minPax: 1,
// //       maxPax: 10,
// //       currentPax: 0,
// //       cutOffHoursBefore: 24,
// //       isForceCanceled: false,
// //       status: 'scheduled',
// //       isActive: true
// //     };

// //     res.status(200).json({
// //       success: true,
// //       data: template
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// /**
//  * Helper function to extract the structure from a mongoose schema
//  * without including validators, setters, getters, etc.
//  */
// function getSchemaStructure(schema: mongoose.Schema) {
//   const paths = schema.paths;
//   const structure: Record<string, any> = {};

//   // Process each path in the schema
//   for (const [key, path] of Object.entries(paths)) {
//     if (key === '__v' || key === '_id') continue;
    
//     // Basic type info
//     const pathInfo: Record<string, any> = {
//       type: path.instance,
//       required: path.isRequired
//     };
    
//     // Add enum values if they exist
//     if ('enumValues' in path && path.enumValues && Array.isArray(path.enumValues) && path.enumValues.length > 0) {
//       pathInfo.enum = path.enumValues;
//     }
    
//     // Add default value if it exists
//     if ('defaultValue' in path && path.defaultValue !== undefined) {
//       pathInfo.default = path.defaultValue;
//     }
    
//     structure[key] = pathInfo;
//   }

//   return structure;
// }
