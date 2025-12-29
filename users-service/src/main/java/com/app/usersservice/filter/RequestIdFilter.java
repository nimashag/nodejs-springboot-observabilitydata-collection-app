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
    private static final String MDC_REQUEST_ID_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Get request ID from header or generate a new one
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }
        
        // Add request ID to response header
        response.setHeader(REQUEST_ID_HEADER, requestId);
        
        // Store in MDC for logging
        MDC.put(MDC_REQUEST_ID_KEY, requestId);
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clean up MDC after request
            MDC.remove(MDC_REQUEST_ID_KEY);
        }
    }
}

