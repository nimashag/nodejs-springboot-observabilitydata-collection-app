# How to Run Users Service

## Prerequisites
- ✅ Java 17 installed
- ✅ Apache Maven 3.9.11 installed
- MongoDB connection (configured in `application.properties`)

## Step-by-Step Instructions

### Step 1: Navigate to the Service Directory
Open PowerShell or Command Prompt and navigate to the users-service directory:
```powershell
cd "c:\Users\User\Desktop\Research-Project\nodejs-springboot-observabilitydata-collection-app\users-service"
```

### Step 2: Clean and Build the Project
Build the project using Maven (this will download dependencies and compile the code):
```powershell
mvn clean install
```

**Note:** The first time you run this, Maven will download all dependencies, which may take a few minutes.

### Step 3: Run the Service
You have two options to run the service:

#### Option A: Using Maven Spring Boot Plugin (Recommended)
```powershell
mvn spring-boot:run
```

#### Option B: Using the JAR file
After building, you can run the generated JAR file:
```powershell
java -jar target\users-service-1.0.0.jar
```

### Step 4: Verify the Service is Running
Once started, you should see Spring Boot startup logs. The service will be available at:
- **URL:** http://localhost:3003
- **Port:** 3003 (as configured in `application.properties`)

### Step 5: Test the Service
You can test if the service is running by opening a browser or using curl:
```powershell
curl http://localhost:3003
```

Or open in browser: http://localhost:3003

## Environment Variables (Optional)
If you need to override configuration, you can set environment variables:
- `MONGO_URI` - MongoDB connection string (default is in application.properties)
- `JWT_SECRET` - JWT secret key (default is in application.properties)

Example:
```powershell
$env:MONGO_URI="your-mongodb-connection-string"
$env:JWT_SECRET="your-jwt-secret"
mvn spring-boot:run
```

## Troubleshooting

### Port Already in Use
If port 3003 is already in use, you can:
1. Change the port in `application.properties`: `server.port=3004`
2. Or stop the process using port 3003

### MongoDB Connection Issues
Make sure your MongoDB connection string in `application.properties` is correct and accessible.

### Build Errors
If you encounter build errors:
1. Clean the project: `mvn clean`
2. Delete the `target` folder if it exists
3. Try building again: `mvn clean install`

## Quick Start (All-in-One)
```powershell
cd "c:\Users\User\Desktop\Research-Project\nodejs-springboot-observabilitydata-collection-app\users-service"
mvn clean install
mvn spring-boot:run
```
