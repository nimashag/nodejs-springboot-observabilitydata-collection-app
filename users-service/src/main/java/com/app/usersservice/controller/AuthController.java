package com.app.usersservice.controller;

import com.app.usersservice.dto.LoginRequest;
import com.app.usersservice.dto.LoginResponse;
import com.app.usersservice.dto.RegisterRequest;
import com.app.usersservice.dto.UserResponse;
import com.app.usersservice.model.User;
import com.app.usersservice.service.UserService;
import com.app.usersservice.util.LoggingUtil;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;
    
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        try {
            LoggingUtil.info(
                log,
                "auth.register.request",
                Map.of("email", request.getEmail(), "role", request.getRole())
            );
            userService.registerUser(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "User registered successfully");
            LoggingUtil.info(
                log,
                "auth.register.success",
                Map.of("email", request.getEmail())
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User already exists")) {
                LoggingUtil.warn(
                    log,
                    "auth.register.conflict",
                    Map.of("email", request.getEmail())
                );
                return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "User already exists"));
            }
            LoggingUtil.error(log, "auth.register.failure", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Registration failed", "error", e.getMessage()));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.register.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Registration failed", "error", e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest request) {
        try {
            LoggingUtil.info(
                log,
                "auth.login.request",
                Map.of("email", request.getEmail())
            );
            LoginResponse response = userService.loginUser(request);
            LoggingUtil.info(
                log,
                "auth.login.success",
                Map.of("email", request.getEmail())
            );
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                LoggingUtil.warn(log, "auth.login.not_found", 
                    Map.of("email", request.getEmail(), "reason", "User not found in database"));
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            if (e.getMessage().equals("Invalid credentials")) {
                LoggingUtil.warn(log, "auth.login.invalid_credentials", 
                    Map.of("email", request.getEmail(), "reason", "Password mismatch"));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
            }
            LoggingUtil.warn(
                log,
                "auth.login.failure",
                Map.of("email", request.getEmail(), "reason", e.getMessage())
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Login failed", "error", e.getMessage()));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.login.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Login failed", "error", e.getMessage()));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        try {
            String userId = authentication.getName();
            LoggingUtil.info(log, "auth.me.request", 
                Map.of("userId", userId));
            UserResponse user = userService.getMyProfile(userId);
            LoggingUtil.info(log, "auth.me.success", 
                Map.of("userId", userId, "email", user.getEmail()));
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                LoggingUtil.warn(log, "auth.me.not_found", 
                    Map.of("userId", authentication.getName(), "reason", "User not found"));
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            LoggingUtil.error(log, "auth.me.failure", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to fetch user", "error", e.getMessage()));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.me.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to fetch user", "error", e.getMessage()));
        }
    }
    
    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_appAdmin')")
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        try {
            String userId = authentication != null ? authentication.getName() : "unknown";
            LoggingUtil.info(log, "auth.get_all.request", 
                Map.of("requestedBy", userId));
            List<UserResponse> users = userService.getAllUsers();
            LoggingUtil.info(log, "auth.get_all.success", 
                Map.of("requestedBy", userId, "count", users.size()));
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.get_all.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to fetch users", "error", e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        try {
            LoggingUtil.info(log, "auth.get_by_id.request", 
                Map.of("userId", id));
            UserResponse user = userService.getUserById(id);
            LoggingUtil.info(log, "auth.get_by_id.success", 
                Map.of("userId", id, "email", user.getEmail()));
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                LoggingUtil.warn(log, "auth.get_by_id.not_found", 
                    Map.of("userId", id, "reason", "User not found"));
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            LoggingUtil.error(log, "auth.get_by_id.failure", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error fetching user data"));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.get_by_id.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error fetching user data"));
        }
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_appAdmin')")
    public ResponseEntity<?> updateUserById(@PathVariable String id, @RequestBody User updateData, 
                                           Authentication authentication) {
        try {
            String requestedBy = authentication != null ? authentication.getName() : "unknown";
            LoggingUtil.info(log, "auth.update.request", 
                Map.of("userId", id, "requestedBy", requestedBy));
            UserResponse updatedUser = userService.updateUserById(id, updateData);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User updated successfully");
            response.put("user", updatedUser);
            LoggingUtil.info(log, "auth.update.success", 
                Map.of("userId", id, "requestedBy", requestedBy, "email", updatedUser.getEmail()));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                LoggingUtil.warn(log, "auth.update.not_found", 
                    Map.of("userId", id, "reason", "User not found"));
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            LoggingUtil.error(log, "auth.update.failure", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to update user", "error", e.getMessage()));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.update.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to update user", "error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_appAdmin')")
    public ResponseEntity<?> deleteUserById(@PathVariable String id, Authentication authentication) {
        try {
            String requestedBy = authentication != null ? authentication.getName() : "unknown";
            LoggingUtil.info(log, "auth.delete.request", 
                Map.of("userId", id, "requestedBy", requestedBy));
            userService.deleteUserById(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "User deleted successfully");
            LoggingUtil.info(log, "auth.delete.success", 
                Map.of("userId", id, "requestedBy", requestedBy));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                LoggingUtil.warn(log, "auth.delete.not_found", 
                    Map.of("userId", id, "reason", "User not found"));
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            LoggingUtil.error(log, "auth.delete.failure", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to delete user", "error", e.getMessage()));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.delete.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to delete user", "error", e.getMessage()));
        }
    }
}
