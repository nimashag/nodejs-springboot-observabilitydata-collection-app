// Note: This file should be copied to your service and mongoose types will be available there
// TypeScript errors here are expected - mongoose types will be available when integrated into services
// @ts-ignore - mongoose types available in service context
import mongoose from 'mongoose';
import { trackDbQuery } from './metricsMiddleware';

// Declare global for requestId storage
declare global {
  // eslint-disable-next-line no-var
  var currentRequestId: string | undefined;
}

/**
 * Mongoose plugin to track database query execution time per request
 * 
 * Usage:
 * import mongoose from 'mongoose';
 * import { mongooseQueryTracker } from './request-metrics-capture/nodejs/mongoosePlugin';
 * mongoose.plugin(mongooseQueryTracker);
 */

export function mongooseQueryTracker(schema: mongoose.Schema): void {
  // Track queries (as any: Mongoose types can be restrictive for array of methods)
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'count', 'countDocuments', 'distinct'] as any, function() {
    const startTime = Date.now();
    const query = this as any;
    
    // Get requestId from query context if available
    const requestId = query.getOptions?.()?.requestId || 
                     (query as any).requestId ||
                     (typeof global !== 'undefined' ? (global as any).currentRequestId : undefined);
    
    if (requestId) {
      query._metricsStartTime = startTime;
      query._metricsRequestId = requestId;
    }
  });

  schema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'count', 'countDocuments', 'distinct'] as any, function() {
    const query = this as any;
    if (query._metricsStartTime && query._metricsRequestId) {
      const queryTime = Date.now() - query._metricsStartTime;
      trackDbQuery(query._metricsRequestId, queryTime);
    }
  });

  // Track save operations
  schema.pre('save', function() {
    const doc = this as any;
    const startTime = Date.now();
    const requestId = doc.getOptions?.()?.requestId || 
                     doc.requestId ||
                     (typeof global !== 'undefined' ? (global as any).currentRequestId : undefined);
    
    if (requestId) {
      doc._metricsStartTime = startTime;
      doc._metricsRequestId = requestId;
    }
  });

  schema.post('save', function() {
    const doc = this as any;
    if (doc._metricsStartTime && doc._metricsRequestId) {
      const queryTime = Date.now() - doc._metricsStartTime;
      trackDbQuery(doc._metricsRequestId, queryTime);
    }
  });

  // Track delete operations (as any: Mongoose types omit these from overloads)
  schema.pre(['deleteOne', 'deleteMany', 'remove'] as any, function() {
    const query = this as any;
    const startTime = Date.now();
    const requestId = query.getOptions?.()?.requestId || 
                     (query as any).requestId ||
                     (typeof global !== 'undefined' ? (global as any).currentRequestId : undefined);
    
    if (requestId) {
      query._metricsStartTime = startTime;
      query._metricsRequestId = requestId;
    }
  });

  schema.post(['deleteOne', 'deleteMany', 'remove'] as any, function() {
    const query = this as any;
    if (query._metricsStartTime && query._metricsRequestId) {
      const queryTime = Date.now() - query._metricsStartTime;
      trackDbQuery(query._metricsRequestId, queryTime);
    }
  });
}

/**
 * Enhanced middleware that sets requestId in mongoose queries
 */
export function enhanceMongooseWithRequestId(req: any, res: any, next: any): void {
  const requestId = req.get?.('X-Request-Id') || req.headers?.['x-request-id'] || (req as any).metricsRequestId;
  
  if (requestId) {
    // Store in global context for mongoose to access
    if (typeof global !== 'undefined') {
      (global as any).currentRequestId = requestId;
    }
    
    // Also store in request for direct access
    (req as any).metricsRequestId = requestId;
  }
  
  res.on('finish', () => {
    if (typeof global !== 'undefined') {
      delete (global as any).currentRequestId;
    }
  });
  
  next();
}

