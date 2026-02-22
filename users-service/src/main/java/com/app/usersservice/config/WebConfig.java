package com.app.usersservice.config;

import com.app.usersservice.interceptor.AlertCollectorInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web Configuration for Users Service
 * 
 * Registers the AlertCollectorInterceptor to track all HTTP requests
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    private final AlertCollectorInterceptor alertCollectorInterceptor;
    
    @Autowired
    public WebConfig(AlertCollectorInterceptor alertCollectorInterceptor) {
        this.alertCollectorInterceptor = alertCollectorInterceptor;
    }
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(alertCollectorInterceptor)
                .addPathPatterns("/**");
    }
}

