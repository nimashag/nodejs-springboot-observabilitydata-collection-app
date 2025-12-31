package com.app.usersservice.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {
    
    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration}")
    private Long expiration;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    
    public String generateToken(String userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        
        LoggingUtil.info(log, "jwt.token.generate.start", 
            Map.of("userId", userId, "role", role, "expirationMs", expiration));
        
        String token = Jwts.builder()
                .claim("id", userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
        
        LoggingUtil.info(log, "jwt.token.generate.success", 
            Map.of("userId", userId, "role", role, "tokenLength", token.length()));
        
        return token;
    }
    
    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    public String extractUserId(String token) {
        Claims claims = extractClaims(token);
        return claims.get("id", String.class);
    }
    
    public String extractRole(String token) {
        Claims claims = extractClaims(token);
        return claims.get("role", String.class);
    }
    
    public boolean validateToken(String token) {
        try {
            Claims claims = extractClaims(token);
            String userId = claims.get("id", String.class);
            String role = claims.get("role", String.class);
            
            LoggingUtil.info(log, "jwt.token.validate.success", 
                Map.of("userId", userId, "role", role));
            return true;
        } catch (Exception e) {
            LoggingUtil.warn(log, "jwt.token.validate.failed", 
                Map.of("reason", e.getClass().getSimpleName(), "message", e.getMessage()));
            return false;
        }
    }
}
