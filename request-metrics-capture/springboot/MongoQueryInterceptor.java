package com.app.metrics;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Interceptor to track MongoDB query execution time
 * 
 * This should be integrated with Spring Data MongoDB to track query times
 * per request.
 */
@Component
public class MongoQueryInterceptor {
    
    private MetricsCaptureFilter metricsCaptureFilter;
    
    @Autowired(required = false)
    public void setMetricsCaptureFilter(MetricsCaptureFilter metricsCaptureFilter) {
        this.metricsCaptureFilter = metricsCaptureFilter;
    }
    
    /**
     * Track a MongoDB query execution
     */
    public void trackQuery(String operation, long durationMs) {
        if (metricsCaptureFilter == null) {
            return;
        }
        
        // Get requestId from current request context
        String requestId = getCurrentRequestId();
        if (requestId != null) {
            metricsCaptureFilter.trackDbQuery(requestId, durationMs);
        }
    }
    
    /**
     * Get current request ID from request context
     */
    private String getCurrentRequestId() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes) {
            HttpServletRequest request = ((ServletRequestAttributes) requestAttributes).getRequest();
            return (String) request.getAttribute("metricsRequestId");
        }
        return null;
    }
}

/**
 * Wrapper for MongoTemplate to track queries
 * 
 * Usage:
 * @Autowired
 * private MongoTemplate mongoTemplate;
 * 
 * @Autowired
 * private MongoQueryInterceptor queryInterceptor;
 * 
 * // Wrap queries:
 * long startTime = System.currentTimeMillis();
 * List<Entity> results = mongoTemplate.find(query, Entity.class);
 * queryInterceptor.trackQuery("find", System.currentTimeMillis() - startTime);
 */
@Component
public class TrackedMongoTemplate {
    
    private final MongoTemplate mongoTemplate;
    private final MongoQueryInterceptor queryInterceptor;
    
    public TrackedMongoTemplate(MongoTemplate mongoTemplate, MongoQueryInterceptor queryInterceptor) {
        this.mongoTemplate = mongoTemplate;
        this.queryInterceptor = queryInterceptor;
    }
    
    public <T> T findOne(Query query, Class<T> entityClass) {
        long startTime = System.currentTimeMillis();
        try {
            return mongoTemplate.findOne(query, entityClass);
        } finally {
            queryInterceptor.trackQuery("findOne", System.currentTimeMillis() - startTime);
        }
    }
    
    public <T> java.util.List<T> find(Query query, Class<T> entityClass) {
        long startTime = System.currentTimeMillis();
        try {
            return mongoTemplate.find(query, entityClass);
        } finally {
            queryInterceptor.trackQuery("find", System.currentTimeMillis() - startTime);
        }
    }
    
    public <T> T save(T entity) {
        long startTime = System.currentTimeMillis();
        try {
            return mongoTemplate.save(entity);
        } finally {
            queryInterceptor.trackQuery("save", System.currentTimeMillis() - startTime);
        }
    }
    
    public <T> void remove(Query query, Class<T> entityClass) {
        long startTime = System.currentTimeMillis();
        try {
            mongoTemplate.remove(query, entityClass);
        } finally {
            queryInterceptor.trackQuery("remove", System.currentTimeMillis() - startTime);
        }
    }
    
    // Add other methods as needed
}

