# Server Refactoring Guide

This document outlines the refactoring improvements applied to the server codebase to reduce repetition and improve maintainability.

## 🎯 Key Improvements

### 1. **Base Service Class** (`src/services/BaseService.ts`)
- Provides common CRUD operations for all services
- Eliminates code duplication across service layers
- Includes: `getAll`, `getById`, `create`, `update`, `delete`, `search`, `count`, `exists`
- Child services only need to implement custom business logic

**Usage Example:**
```typescript
export class TourService extends BaseService<Tour> {
  constructor() {
    super(TourModel);
  }
  
  // Override only custom methods
  protected buildSearchQuery(searchParams: any) {
    // Custom search logic
  }
}
```

### 2. **Base Controller Class** (`src/controllers/BaseController.ts`)
- Provides common controller methods
- Handles request/response patterns consistently
- Reduces boilerplate in route handlers

**Usage Example:**
```typescript
export class TourController extends BaseController<Tour> {
  constructor() {
    super(new TourService(), 'Tour');
  }
  
  // Add custom controller methods as needed
}
```

### 3. **Route Wrapper Utilities** (`src/utils/routeWrapper.ts`)
- `asyncHandler`: Automatically catches errors in async route handlers
- `protectedRoute`: Wrapper for routes with multiple middleware
- Eliminates need for try-catch blocks in every route handler

**Before:**
```typescript
router.get('/', authenticate as any, isAdminOrSeller as any, getAll as any);
```

**After:**
```typescript
router.get('/', authenticate, isAdminOrSeller, asyncHandler(getAll));
```

### 4. **Centralized Response Handlers** (`src/utils/responseHandler.ts`)
- `sendSuccess`: Consistent success response format
- `sendError`: Consistent error response format
- `sendPaginatedResponse`: Standardized pagination responses

**Usage:**
```typescript
sendSuccess(res, data, 'Tours retrieved successfully');
sendPaginatedResponse(res, items, pagination, 'Success');
```

### 5. **Centralized Error Handling** (`src/middlewares/errorHandler.ts`)
- Single error handling middleware for the entire app
- Consistent error response format
- Environment-aware error details (stack traces in development only)
- Includes 404 handler

**Usage in app.ts:**
```typescript
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// ... routes ...

app.use(notFoundHandler);
app.use(errorHandler);
```

### 6. **Enhanced Configuration** (`src/config/config.ts`)
- Environment variable validation at startup
- Grouped configuration (cloudinary, email, oauth, etc.)
- Backward compatibility with legacy field names
- Type-safe configuration object

**Features:**
- Validates required environment variables
- Provides helpful error messages
- Organized into logical groups
- Frozen object prevents accidental modifications

### 7. **Database Connection with Retry Logic** (`src/config/db.ts`)
- Automatic retry on connection failure
- Configurable retry attempts and delay
- Connection event handlers (error, disconnect, reconnect)
- Graceful shutdown on SIGINT
- Environment-aware behavior

**Features:**
- 5 retry attempts by default
- 5-second delay between retries
- Detailed logging with emojis for visibility
- Production vs development behavior

### 8. **Mongoose Plugins** (`src/plugins/timestampPlugin.ts`)
- `timestampPlugin`: Automatic timestamp management
- `softDeletePlugin`: Soft delete functionality
- Reusable across all schemas

**Usage:**
```typescript
import { timestampPlugin, softDeletePlugin } from '../plugins/timestampPlugin';

schema.plugin(timestampPlugin);
schema.plugin(softDeletePlugin);
```

## 📁 File Structure

```
server/src/
├── services/
│   └── BaseService.ts          # Base service class
├── controllers/
│   └── BaseController.ts       # Base controller class
├── utils/
│   ├── routeWrapper.ts         # Async handler & route utilities
│   ├── responseHandler.ts      # Response formatting utilities
│   └── pagination.ts           # Pagination utility (existing)
├── middlewares/
│   └── errorHandler.ts         # Centralized error handling
├── plugins/
│   └── timestampPlugin.ts      # Mongoose plugins
└── config/
    ├── config.ts               # Enhanced configuration
    └── db.ts                   # Enhanced database connection
```

## 🔄 Migration Guide

### For Existing Services

1. **Extend BaseService:**
```typescript
// Before
export class MyService {
  static async getAll() { ... }
  static async getById(id: string) { ... }
  // ... more CRUD methods
}

// After
export class MyService extends BaseService<MyModel> {
  constructor() {
    super(MyModel);
  }
  
  // Only implement custom methods
  async customMethod() { ... }
}
```

2. **Add Static Methods for Backward Compatibility:**
```typescript
export class MyService extends BaseService<MyModel> {
  private static instance: MyService;
  
  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
  
  static async getAll(filters: any, params: PaginationParams) {
    return MyService.getInstance().getAll(filters, params);
  }
}
```

### For Existing Routes

1. **Remove `as any` type casting and use proper types:**
```typescript
// Before
router.get('/', authenticate as any, isAdminOrSeller as any, getAll as any);

// After
import { RequestHandler } from 'express';
import { AuthRequest } from '../middlewares/authenticate';

router.get(
  '/', 
  authenticate, 
  isAdminOrSeller as RequestHandler, 
  asyncHandler<AuthRequest>(getAll)
);
```

2. **Use asyncHandler for all async routes:**
```typescript
import { asyncHandler } from '../utils/routeWrapper';
import { AuthRequest } from '../middlewares/authenticate';

// For public routes (no authentication)
router.get('/', asyncHandler(getAll));

// For protected routes (with authentication)
router.post(
  '/', 
  authenticate, 
  asyncHandler<AuthRequest>(create)
);
```

3. **Type the asyncHandler based on request type:**
- Use `asyncHandler(handler)` for public routes with standard `Request`
- Use `asyncHandler<AuthRequest>(handler)` for protected routes with `AuthRequest`
- Cast middleware functions like `isAdminOrSeller as RequestHandler` to avoid type conflicts

### For Existing Controllers

1. **Use response handlers:**
```typescript
// Before
res.status(200).json({
  success: true,
  message: 'Success',
  data: result
});

// After
import { sendSuccess } from '../utils/responseHandler';
sendSuccess(res, result, 'Success');
```

2. **Remove try-catch blocks (handled by asyncHandler):**
```typescript
// Before
export const getAll = async (req: Request, res: Response) => {
  try {
    const result = await Service.getAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error });
  }
};

// After
export const getAll = async (req: Request, res: Response) => {
  const result = await Service.getAll();
  sendSuccess(res, result, 'Retrieved successfully');
};
```

## ✅ Benefits

1. **Reduced Code Duplication**: Common operations defined once
2. **Type Safety**: Proper TypeScript types without `as any`
3. **Consistent Error Handling**: All errors handled uniformly
4. **Better Maintainability**: Changes to common logic only need to be made once
5. **Improved Reliability**: Retry logic, validation, and error recovery
6. **Better Developer Experience**: Clear patterns and less boilerplate

## 🚀 Next Steps

1. **Migrate Remaining Services**: Apply BaseService pattern to all services
2. **Migrate Remaining Routes**: Update all routes to use asyncHandler
3. **Add Unit Tests**: Test base classes and utilities
4. **Documentation**: Add JSDoc comments to all public methods
5. **Performance Monitoring**: Add logging and metrics
6. **API Versioning**: Consider adding API versioning support

## 📝 Notes

- The refactored TourService is in `tourService.refactored.ts` - review and replace the original when ready
- All changes are backward compatible through static method wrappers
- Existing code will continue to work during migration
- Gradual migration is recommended - update one service/route at a time

## 🔗 Related Files

- **Refactored Files**: See files with `.refactored.ts` extension
- **Updated Routes**: `factsRoutes.ts`, `faqRouter.ts`, `galleryRoutes.ts`
- **New Utilities**: All files in `utils/`, `services/`, `controllers/`, `plugins/`
