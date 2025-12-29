package com.app.usersservice.interceptor;

import com.app.usersservice.collector.AlertDetector;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Alert Collector Interceptor for Users Service
 * 
 * This interceptor tracks HTTP requests and feeds data to the AlertDetector
 * to detect alert conditions.
 * 
 * NO OpenTelemetry, NO Prometheus, NO external observability libraries
 */
@Component
public class AlertCollectorInterceptor implements HandlerInterceptor {
    
    @Autowired
    private AlertDetector alertDetector;
    
    private static final String START_TIME_ATTR = "alertCollectorStartTime";
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, 
                               Object handler, Exception ex) {
        Long startTime = (Long) request.getAttribute(START_TIME_ATTR);
        if (startTime == null) {
            return;
        }
        
        long duration = System.currentTimeMillis() - startTime;
        int statusCode = response.getStatus();
        boolean isError = statusCode >= 400 || ex != null;
        String errorType = isError ? "HTTP_" + statusCode : null;
        
        // Record request metrics
        alertDetector.recordRequest(duration, isError, errorType);
    }
}

