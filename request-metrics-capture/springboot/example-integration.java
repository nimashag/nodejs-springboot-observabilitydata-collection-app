package com.app.usersservice.config;

import com.app.metrics.MetricsCaptureFilter;
import com.app.metrics.MongoQueryInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Example configuration for Spring Boot service
 * 
 * This shows how to integrate metrics capture into your Spring Boot application
 */
@Configuration
public class MetricsConfig {

    /**
     * Create and register the metrics capture filter
     * Replace "users-service" with your actual service name
     */
    @Bean
    public MetricsCaptureFilter metricsCaptureFilter() {
        return new MetricsCaptureFilter("users-service");
    }

    /**
     * Register MongoQueryInterceptor for DB query tracking
     */
    @Bean
    public MongoQueryInterceptor mongoQueryInterceptor() {
        return new MongoQueryInterceptor();
    }
}

/**
 * Integration steps for Spring Boot (users-service):
 * 
 * 1. Copy MetricsCaptureFilter.java and MongoQueryInterceptor.java to:
 *    src/main/java/com/app/metrics/
 * 
 * 2. Update your WebConfig.java to register the filter:
 * 
 *    @Configuration
 *    public class WebConfig implements WebMvcConfigurer {
 *        
 *        @Autowired
 *        private MetricsCaptureFilter metricsCaptureFilter;
 *        
 *        @Override
 *        public void addInterceptors(InterceptorRegistry registry) {
 *            // Your existing interceptors
 *        }
 *    }
 * 
 *    Note: The filter is auto-registered via @Component annotation
 * 
 * 3. For DB query tracking, wrap your MongoTemplate calls:
 * 
 *    @Autowired
 *    private MongoQueryInterceptor queryInterceptor;
 *    
 *    public User findById(String id) {
 *        long startTime = System.currentTimeMillis();
 *        User user = mongoTemplate.findById(id, User.class);
 *        queryInterceptor.trackQuery("findById", System.currentTimeMillis() - startTime);
 *        return user;
 *    }
 * 
 * 4. Metrics will be written to ./metrics/metrics.jsonl
 * 
 * 5. Add to pom.xml if needed:
 *    <dependency>
 *        <groupId>com.fasterxml.jackson.core</groupId>
 *        <artifactId>jackson-databind</artifactId>
 *    </dependency>
 */

