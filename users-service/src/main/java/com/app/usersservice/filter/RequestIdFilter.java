package com.app.usersservice.filter;

import com.app.usersservice.util.LoggingUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Filter to generate and store request ID in MDC for logging.
 * This ensures every log line includes a requestId.
 */
@Component
@Order(1) // Run before other filters
public class RequestIdFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestIdFilter.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String SESSION_ID_HEADER = "X-Session-Id";
    private static final String MDC_REQUEST_ID_KEY = "requestId";
    private static final String MDC_SESSION_ID_KEY = "sessionId";
    private static final String NO_SESSION = "no-session";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        long startTime = System.currentTimeMillis();
        
        // Get request ID from header or generate a new one
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        boolean requestIdGenerated = false;
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
            requestIdGenerated = true;
        }
        
        // Get session ID from header or use default
        String sessionId = request.getHeader(SESSION_ID_HEADER);
        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = NO_SESSION;
        }
        
        // Add IDs to response headers
        response.setHeader(REQUEST_ID_HEADER, requestId);
        response.setHeader(SESSION_ID_HEADER, sessionId);
        
        // Store in MDC for logging
        MDC.put(MDC_REQUEST_ID_KEY, requestId);
        MDC.put(MDC_SESSION_ID_KEY, sessionId);
        
        // Log incoming request
        Map<String, Object> requestMeta = new HashMap<>();
        requestMeta.put("method", request.getMethod());
        requestMeta.put("uri", request.getRequestURI());
        requestMeta.put("queryString", request.getQueryString() != null ? request.getQueryString() : "");
        requestMeta.put("remoteAddr", request.getRemoteAddr());
        requestMeta.put("userAgent", request.getHeader("User-Agent") != null ? 
            request.getHeader("User-Agent").substring(0, Math.min(100, request.getHeader("User-Agent").length())) : "");
        requestMeta.put("requestIdGenerated", requestIdGenerated);
        
        LoggingUtil.info(log, "request.incoming", requestMeta);
        
        try {
            filterChain.doFilter(request, response);
            
            // Log successful response
            long duration = System.currentTimeMillis() - startTime;
            Map<String, Object> responseMeta = new HashMap<>();
            responseMeta.put("method", request.getMethod());
            responseMeta.put("uri", request.getRequestURI());
            responseMeta.put("statusCode", response.getStatus());
            responseMeta.put("durationMs", duration);
            
            if (response.getStatus() >= 400) {
                LoggingUtil.warn(log, "request.completed.error", responseMeta);
            } else {
                LoggingUtil.info(log, "request.completed.success", responseMeta);
            }
        } catch (Exception e) {
            // Log error response
            long duration = System.currentTimeMillis() - startTime;
            Map<String, Object> errorMeta = new HashMap<>();
            errorMeta.put("method", request.getMethod());
            errorMeta.put("uri", request.getRequestURI());
            errorMeta.put("statusCode", response.getStatus());
            errorMeta.put("durationMs", duration);
            
            LoggingUtil.error(log, "request.completed.exception", 
                "Request processing failed", e);
        } finally {
            // Clean up MDC after request
            MDC.remove(MDC_REQUEST_ID_KEY);
            MDC.remove(MDC_SESSION_ID_KEY);
        }
    }
}

