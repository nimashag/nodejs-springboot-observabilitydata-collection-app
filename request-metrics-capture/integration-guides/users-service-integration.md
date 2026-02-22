# Users Service (Spring Boot) - Metrics Integration Guide

## Steps to Integrate

### 1. Create Metrics Package Directory

First, create the `com.app.metrics` package directory:

```bash
mkdir -p users-service/src/main/java/com/app/metrics
```

### 2. Copy Files to Users Service

```bash
cp request-metrics-capture/springboot/MetricsCaptureFilter.java users-service/src/main/java/com/app/metrics/
cp request-metrics-capture/springboot/MongoQueryInterceptor.java users-service/src/main/java/com/app/metrics/
```

### 3. About the Metrics Folder

The metrics folder is **automatically created** when the service starts. You don't need to create it manually.

**Important:** The metrics folder is **NOT** inside the Java source directory (`src/main/java/`). It's created at the **service root level**.

**Directory Structure:**
```
users-service/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               ├── app/
│               │   ├── metrics/              ← Java classes go here
│               │   │   ├── MetricsCaptureFilter.java
│               │   │   └── MongoQueryInterceptor.java
│               │   └── usersservice/         ← Your existing service code
│               │       ├── controller/
│               │       ├── service/
│               │       └── ...
│               └── ...
├── metrics/                                  ← Metrics folder (created at runtime)
│   └── metrics.jsonl                         ← Metrics file (created after first request)
├── pom.xml
└── ...
```

**Location:** `users-service/metrics/metrics.jsonl` (at service root, same level as `src/`)

**When it's created:**
- The `MetricsCaptureFilter` automatically creates the `./metrics` directory on startup
- The `metrics.jsonl` file is created when the first HTTP request completes

**To verify the folder exists after starting the service:**
```bash
cd users-service
ls -la metrics/
# Should show: metrics.jsonl (after first request)
```

**Note:** The metrics folder is created relative to where the Spring Boot application runs (typically the `users-service/` directory root, not inside `src/`).

### 4. Update `MetricsCaptureFilter.java`

Open `users-service/src/main/java/com/app/metrics/MetricsCaptureFilter.java` and ensure the service name is set:

**Option 1: Hardcode service name**
```java
public MetricsCaptureFilter() {
    this();
    this.serviceName = "users-service";
}
```

**Option 2: Use Spring property (recommended)**
```java
@Value("${spring.application.name:users-service}")
private String serviceName;

public MetricsCaptureFilter() {
    // Ensure metrics directory exists
    try {
        Files.createDirectories(Paths.get(METRICS_DIR));
    } catch (IOException e) {
        log.error("Failed to create metrics directory", e);
    }
}
```

### 5. Update `MongoQueryInterceptor.java`

Ensure it's properly configured to work with `MetricsCaptureFilter`:

```java
@Component
public class MongoQueryInterceptor {
    
    private MetricsCaptureFilter metricsCaptureFilter;
    
    @Autowired(required = false)
    public void setMetricsCaptureFilter(MetricsCaptureFilter metricsCaptureFilter) {
        this.metricsCaptureFilter = metricsCaptureFilter;
    }
    
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
```

### 6. Track Database Queries in UserService

Update `users-service/src/main/java/com/app/usersservice/service/UserService.java`:

**Add import:**
```java
import com.app.metrics.MongoQueryInterceptor;
```

**Add field:**
```java
@Autowired
private MongoQueryInterceptor queryInterceptor;
```

**Wrap repository calls with query tracking:**

Example for `findByEmail`:
```java
public void registerUser(RegisterRequest request) {
    LoggingUtil.info(log, "user.register.start", 
        Map.of("email", request.getEmail(), "role", request.getRole().name()));
    
    long queryStart = System.currentTimeMillis();
    Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
    queryInterceptor.trackQuery("findByEmail", System.currentTimeMillis() - queryStart);
    
    if (existingUser.isPresent()) {
        // ... rest of code
    }
    
    // ... create user ...
    
    queryStart = System.currentTimeMillis();
    User savedUser = userRepository.save(user);
    queryInterceptor.trackQuery("save", System.currentTimeMillis() - queryStart);
    
    // ... rest of code
}
```

**Complete updated methods:**

```java
public LoginResponse loginUser(LoginRequest request) {
    LoggingUtil.info(log, "user.login.start", 
        Map.of("email", request.getEmail()));
    
    long queryStart = System.currentTimeMillis();
    Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
    queryInterceptor.trackQuery("findByEmail", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}

public List<UserResponse> getAllUsers() {
    LoggingUtil.info(log, "user.get_all.start", Map.of());
    
    long queryStart = System.currentTimeMillis();
    List<User> users = userRepository.findAll();
    queryInterceptor.trackQuery("findAll", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}

public UserResponse getMyProfile(String userId) {
    LoggingUtil.info(log, "user.get_profile.start", 
        Map.of("userId", userId));
    
    long queryStart = System.currentTimeMillis();
    Optional<User> userOpt = userRepository.findById(userId);
    queryInterceptor.trackQuery("findById", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}

public UserResponse getUserById(String id) {
    LoggingUtil.info(log, "user.get_by_id.start", 
        Map.of("userId", id));
    
    long queryStart = System.currentTimeMillis();
    Optional<User> userOpt = userRepository.findById(id);
    queryInterceptor.trackQuery("findById", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}

public UserResponse updateUserById(String id, User updateData) {
    // ... existing code ...
    
    long queryStart = System.currentTimeMillis();
    User savedUser = userRepository.save(user);
    queryInterceptor.trackQuery("save", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}

public void deleteUserById(String id) {
    LoggingUtil.info(log, "user.delete.start", 
        Map.of("userId", id));
    
    long queryStart = System.currentTimeMillis();
    Optional<User> userOpt = userRepository.findById(id);
    queryInterceptor.trackQuery("findById", System.currentTimeMillis() - queryStart);
    
    if (userOpt.isEmpty()) {
        // ... error handling
    }
    
    User user = userOpt.get();
    
    queryStart = System.currentTimeMillis();
    userRepository.deleteById(id);
    queryInterceptor.trackQuery("deleteById", System.currentTimeMillis() - queryStart);
    
    // ... rest of existing code
}
```

### 7. Add Component Scan (Required)

Update `users-service/src/main/java/com/app/usersservice/UsersServiceApplication.java` to include `com.app.metrics` in component scanning:

```java
package com.app.usersservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.app.usersservice", "com.app.metrics"})
public class UsersServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UsersServiceApplication.class, args);
    }
}
```

This ensures Spring discovers and registers the `MetricsCaptureFilter` component.

### 8. Verify Filter is Registered

The filter is automatically registered via `@Component` annotation. Verify it's being scanned by Spring:

- Check that `com.app.metrics` package is in your component scan
- Or add explicit component scan if needed in your main application class

### 9. Verify Integration

1. **Start the service:** `mvn spring-boot:run` or run from IDE
   - The `metrics/` folder will be created automatically on startup
   
2. **Make a test request:**
   ```bash
   curl http://localhost:3003/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

3. **Check metrics folder and file:**
   ```bash
   # Verify folder exists
   ls -la users-service/metrics/
   
   # View metrics (one JSON line per request)
   cat users-service/metrics/metrics.jsonl
   ```
   
   **Expected folder structure:**
   ```
   users-service/
   ├── metrics/                    ← Created automatically at service root
   │   └── metrics.jsonl          ← Created after first request
   ├── src/
   │   └── main/
   │       └── java/
   │           └── com/
   │               └── app/
   │                   ├── metrics/          ← Java classes (MetricsCaptureFilter, etc.)
   │                   └── usersservice/     ← Your service code
   ├── pom.xml
   └── ...
   ```

Expected output format:
```json
{"request_id":"...","service":"users-service","http":{"method":"POST","route":"POST /api/auth/login","path":"/api/auth/login","status_code":200},"timing":{"start_ts_ms":...,"end_ts_ms":...,"duration_ms":...},"metrics":{"cpu_percent":...,"rss_mb":...,"heap_used_mb":...,"db_query_time_ms":...}}
```

## Alternative: AOP-Based Query Tracking (Advanced)

If you want automatic query tracking without manual wrapping, you can use Spring AOP:

1. Add AOP dependency to `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

2. Create an AOP aspect to intercept repository calls (optional, more complex but automatic)

## Notes

- The filter runs automatically for all requests via `@Component` and `@Order(0)`
- DB query tracking requires manual wrapping of repository calls
- **Metrics folder location:** `users-service/metrics/` (at service root, NOT inside `src/`)
- **Metrics file:** `users-service/metrics/metrics.jsonl` (created after first HTTP request completes)
- **Java classes location:** `users-service/src/main/java/com/app/metrics/` (source code)
- Each request generates exactly one JSON line in the metrics file
- The metrics folder is created relative to where the Spring Boot application runs (service root directory)

## Troubleshooting

**Metrics folder not created?**
- Ensure the service started successfully (check logs)
- The folder is created on filter initialization, which happens at startup
- Check that `MetricsCaptureFilter` is being scanned (see step 7)
- **Important:** The folder is created at `users-service/metrics/` (service root), NOT inside `src/`

**Metrics file not created?**
- Make sure you've made at least one HTTP request to the service
- Check file permissions in the `users-service/` directory
- Verify the service is running from the `users-service/` directory (not a parent directory)
- Check that the `metrics/` folder exists at the service root level (same level as `src/` and `pom.xml`)

