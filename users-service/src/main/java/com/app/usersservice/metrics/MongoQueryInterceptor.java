package com.app.usersservice.metrics;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Interceptor to track MongoDB query execution time
 * 
 * Use in UserService to wrap repository calls:
 *   long start = System.currentTimeMillis();
 *   Optional<User> user = userRepository.findByEmail(email);
 *   queryInterceptor.trackQuery("findByEmail", System.currentTimeMillis() - start);
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
        
        String requestId = getCurrentRequestId();
        if (requestId != null) {
            metricsCaptureFilter.trackDbQuery(requestId, durationMs);
        }
    }
    
    private String getCurrentRequestId() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes) {
            HttpServletRequest request = ((ServletRequestAttributes) requestAttributes).getRequest();
            return (String) request.getAttribute("metricsRequestId");
        }
        return null;
    }
}
