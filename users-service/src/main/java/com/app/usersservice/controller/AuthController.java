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
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            if (e.getMessage().equals("Invalid credentials")) {
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
            UserResponse user = userService.getMyProfile(userId);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
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
    public ResponseEntity<?> getAllUsers() {
        try {
            List<UserResponse> users = userService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to fetch users", "error", e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        try {
            UserResponse user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error fetching user data"));
        } catch (Exception e) {
            LoggingUtil.error(log, "auth.get-by-id.exception", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error fetching user data"));
        }
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_appAdmin')")
    public ResponseEntity<?> updateUserById(@PathVariable String id, @RequestBody User updateData) {
        try {
            UserResponse updatedUser = userService.updateUserById(id, updateData);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User updated successfully");
            response.put("user", updatedUser);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to update user", "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to update user", "error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_appAdmin')")
    public ResponseEntity<?> deleteUserById(@PathVariable String id) {
        try {
            userService.deleteUserById(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "User deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("User not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to delete user", "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Failed to delete user", "error", e.getMessage()));
        }
    }
}
