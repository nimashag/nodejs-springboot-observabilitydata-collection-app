package com.app.usersservice.service;

import com.app.usersservice.dto.LoginRequest;
import com.app.usersservice.dto.LoginResponse;
import com.app.usersservice.dto.RegisterRequest;
import com.app.usersservice.dto.UserResponse;
import com.app.usersservice.model.User;
import com.app.usersservice.model.UserRole;
import com.app.usersservice.repository.UserRepository;
import com.app.usersservice.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    public void registerUser(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
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
        userRepository.save(user);
    }
    
    public LoginResponse loginUser(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        
        if (!user.comparePassword(request.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        String token = jwtUtil.generateToken(user.getId(), user.getRole().name());
        UserResponse userResponse = new UserResponse(user);
        
        return new LoginResponse(token, userResponse);
    }
    
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }
    
    public UserResponse getMyProfile(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return new UserResponse(userOpt.get());
    }
    
    public UserResponse getUserById(String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        return new UserResponse(userOpt.get());
    }
    
    public UserResponse updateUserById(String id, User updateData) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOpt.get();
        
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
        
        userRepository.save(user);
        return new UserResponse(user);
    }
    
    public void deleteUserById(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
    }
}
