package com.app.usersservice.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter to generate and store request ID in MDC for logging.
 * This ensures every log line includes a requestId.
 */
@Component
@Order(1) // Run before other filters
public class RequestIdFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String SESSION_ID_HEADER = "X-Session-Id";
    private static final String MDC_REQUEST_ID_KEY = "requestId";
    private static final String MDC_SESSION_ID_KEY = "sessionId";
    private static final String NO_SESSION = "no-session";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Get request ID from header or generate a new one
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
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
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clean up MDC after request
            MDC.remove(MDC_REQUEST_ID_KEY);
            MDC.remove(MDC_SESSION_ID_KEY);
        }
    }
}

