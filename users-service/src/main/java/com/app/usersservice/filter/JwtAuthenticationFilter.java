package com.app.usersservice.filter;

import com.app.usersservice.util.JwtUtil;
import com.app.usersservice.util.LoggingUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Log when no auth header is present (for public endpoints)
            if (request.getRequestURI().startsWith("/api/auth/")) {
                // Public endpoint, no auth needed
            } else {
                LoggingUtil.warn(logger, "jwt.missing", 
                    Map.of("uri", request.getRequestURI(), "method", request.getMethod(),
                           "reason", "No Authorization header or invalid format"));
            }
            filterChain.doFilter(request, response);
            return;
        }
        
        String token = authHeader.substring(7);
        
        try {
            if (jwtUtil.validateToken(token)) {
                String userId = jwtUtil.extractUserId(token);
                String role = jwtUtil.extractRole(token);
                
                LoggingUtil.info(logger, "jwt.validation.success", 
                    Map.of("userId", userId, "role", role, "uri", request.getRequestURI()));
                
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                );
                
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } else {
                LoggingUtil.warn(logger, "jwt.validation.invalid", 
                    Map.of("uri", request.getRequestURI(), "reason", "Token validation returned false"));
            }
        } catch (Exception e) {
            LoggingUtil.error(logger, "jwt.validation.failed", 
                "JWT validation failed: " + e.getMessage(), e);
        }
        
        filterChain.doFilter(request, response);
    }
}
