package com.app.usersservice.config;

import com.app.usersservice.interceptor.AlertCollectorInterceptor;
import com.app.usersservice.interceptor.TelemetryInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web Configuration for Users Service
 *
 * Registers interceptors to track HTTP requests:
 * - AlertCollectorInterceptor (existing)
 * - TelemetryInterceptor (metrics + latency + errors)
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
        // Keep existing alert collector
        registry.addInterceptor(alertCollectorInterceptor)
                .addPathPatterns("/**");

        // Add telemetry interceptor
        registry.addInterceptor(new TelemetryInterceptor())
                .addPathPatterns("/**");
    }
}
