package com.app.usersservice.service;

import com.app.usersservice.dto.LoginRequest;
import com.app.usersservice.dto.LoginResponse;
import com.app.usersservice.dto.RegisterRequest;
import com.app.usersservice.dto.UserResponse;
import com.app.usersservice.model.User;
import com.app.usersservice.model.UserRole;
import com.app.usersservice.repository.UserRepository;
import com.app.usersservice.util.JwtUtil;
import com.app.usersservice.util.LoggingUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {
    
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    public void registerUser(RegisterRequest request) {
        LoggingUtil.info(log, "user.register.start", 
            Map.of("email", request.getEmail(), "role", request.getRole().name()));
        
        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            LoggingUtil.warn(log, "user.register.duplicate", 
                Map.of("email", request.getEmail(), "reason", "User already exists"));
            throw new RuntimeException("User already exists");
        }
        
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        
        user.hashPassword();
        User savedUser = userRepository.save(user);
        
        LoggingUtil.info(log, "user.register.success", 
            Map.of("userId", savedUser.getId(), "email", savedUser.getEmail(), 
                   "role", savedUser.getRole().name()));
    }
    
    public LoginResponse loginUser(LoginRequest request) {
        LoggingUtil.info(log, "user.login.start", 
            Map.of("email", request.getEmail()));
        
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isEmpty()) {
            LoggingUtil.warn(log, "user.login.not_found", 
                Map.of("email", request.getEmail(), "reason", "User not found in database"));
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        
        if (!user.comparePassword(request.getPassword())) {
            LoggingUtil.warn(log, "user.login.invalid_password", 
                Map.of("email", request.getEmail(), "userId", user.getId(), 
                       "reason", "Password mismatch"));
            throw new RuntimeException("Invalid credentials");
        }
        
        String token = jwtUtil.generateToken(user.getId(), user.getRole().name());
        UserResponse userResponse = new UserResponse(user);
        
        LoggingUtil.info(log, "user.login.success", 
            Map.of("userId", user.getId(), "email", user.getEmail(), 
                   "role", user.getRole().name(), "tokenGenerated", true));
        
        return new LoginResponse(token, userResponse);
    }
    
    public List<UserResponse> getAllUsers() {
        LoggingUtil.info(log, "user.get_all.start", Map.of());
        
        List<User> users = userRepository.findAll();
        List<UserResponse> userResponses = users.stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
        
        LoggingUtil.info(log, "user.get_all.success", 
            Map.of("count", userResponses.size()));
        
        return userResponses;
    }
    
    public UserResponse getMyProfile(String userId) {
        LoggingUtil.info(log, "user.get_profile.start", 
            Map.of("userId", userId));
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            LoggingUtil.warn(log, "user.get_profile.not_found", 
                Map.of("userId", userId, "reason", "User not found in database"));
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        LoggingUtil.info(log, "user.get_profile.success", 
            Map.of("userId", userId, "email", user.getEmail(), "role", user.getRole().name()));
        
        return new UserResponse(user);
    }
    
    public UserResponse getUserById(String id) {
        LoggingUtil.info(log, "user.get_by_id.start", 
            Map.of("userId", id));
        
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            LoggingUtil.warn(log, "user.get_by_id.not_found", 
                Map.of("userId", id, "reason", "User not found in database"));
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        LoggingUtil.info(log, "user.get_by_id.success", 
            Map.of("userId", id, "email", user.getEmail(), "role", user.getRole().name()));
        
        return new UserResponse(user);
    }
    
    public UserResponse updateUserById(String id, User updateData) {
        Map<String, Object> updateFields = new HashMap<>();
        if (updateData.getName() != null) updateFields.put("name", "updated");
        if (updateData.getEmail() != null) updateFields.put("email", "updated");
        if (updateData.getRole() != null) updateFields.put("role", updateData.getRole().name());
        if (updateData.getPhone() != null) updateFields.put("phone", "updated");
        if (updateData.getAddress() != null) updateFields.put("address", "updated");
        if (updateData.getPassword() != null && !updateData.getPassword().isEmpty()) {
            updateFields.put("password", "updated");
        }
        updateFields.put("approved", updateData.isApproved());
        
        LoggingUtil.info(log, "user.update.start", 
            Map.of("userId", id, "fieldsToUpdate", updateFields));
        
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            LoggingUtil.warn(log, "user.update.not_found", 
                Map.of("userId", id, "reason", "User not found in database"));
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        String oldEmail = user.getEmail();
        UserRole oldRole = user.getRole();
        
        if (updateData.getName() != null) {
            user.setName(updateData.getName());
        }
        if (updateData.getEmail() != null) {
            user.setEmail(updateData.getEmail());
        }
        if (updateData.getRole() != null) {
            user.setRole(updateData.getRole());
        }
        if (updateData.getPhone() != null) {
            user.setPhone(updateData.getPhone());
        }
        if (updateData.getAddress() != null) {
            user.setAddress(updateData.getAddress());
        }
        if (updateData.getPassword() != null && !updateData.getPassword().isEmpty()) {
            user.setPassword(updateData.getPassword());
            user.hashPassword();
        }
        user.setApproved(updateData.isApproved());
        
        User savedUser = userRepository.save(user);
        
        Map<String, Object> successMeta = new HashMap<>();
        successMeta.put("userId", id);
        successMeta.put("email", savedUser.getEmail());
        successMeta.put("role", savedUser.getRole().name());
        if (!oldEmail.equals(savedUser.getEmail())) {
            successMeta.put("emailChanged", true);
        }
        if (oldRole != savedUser.getRole()) {
            successMeta.put("roleChanged", true);
        }
        
        LoggingUtil.info(log, "user.update.success", successMeta);
        
        return new UserResponse(savedUser);
    }
    
    public void deleteUserById(String id) {
        LoggingUtil.info(log, "user.delete.start", 
            Map.of("userId", id));
        
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            LoggingUtil.warn(log, "user.delete.not_found", 
                Map.of("userId", id, "reason", "User not found in database"));
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        userRepository.deleteById(id);
        
        LoggingUtil.info(log, "user.delete.success", 
            Map.of("userId", id, "email", user.getEmail(), "role", user.getRole().name()));
    }
}
