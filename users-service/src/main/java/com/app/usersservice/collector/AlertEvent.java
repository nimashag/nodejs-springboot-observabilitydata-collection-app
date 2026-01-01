package com.app.usersservice.collector;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AlertEvent {
    
    @JsonProperty("timestamp")
    private String timestamp;
    
    @JsonProperty("service_name")
    private String serviceName;
    
    @JsonProperty("alert_name")
    private String alertName;
    
    @JsonProperty("alert_type")
    private String alertType; // error / latency / availability / resource / traffic / security / performance
    
    @JsonProperty("alert_state")
    private String alertState; // fired / resolved
    
    @JsonProperty("alert_duration")
    private Long alertDuration; // milliseconds, only if resolved
    
    @JsonProperty("severity")
    private String severity; // low / medium / high / critical
    
    // Context fields captured at alert time
    @JsonProperty("request_count")
    private int requestCount;
    
    @JsonProperty("error_count")
    private int errorCount;
    
    @JsonProperty("average_response_time")
    private long averageResponseTime;
    
    @JsonProperty("process_cpu_usage")
    private double processCpuUsage;
    
    @JsonProperty("process_memory_usage")
    private long processMemoryUsage;
    
    @JsonProperty("traffic_rate")
    private Double trafficRate;
    
    // Constructors
    public AlertEvent() {}
    
    public AlertEvent(String timestamp, String serviceName, String alertName, 
                     String alertType, String alertState, String severity,
                     int requestCount, int errorCount, long averageResponseTime,
                     double processCpuUsage, long processMemoryUsage) {
        this.timestamp = timestamp;
        this.serviceName = serviceName;
        this.alertName = alertName;
        this.alertType = alertType;
        this.alertState = alertState;
        this.severity = severity;
        this.requestCount = requestCount;
        this.errorCount = errorCount;
        this.averageResponseTime = averageResponseTime;
        this.processCpuUsage = processCpuUsage;
        this.processMemoryUsage = processMemoryUsage;
    }
    
    // Getters and Setters
    public String getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getServiceName() {
        return serviceName;
    }
    
    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }
    
    public String getAlertName() {
        return alertName;
    }
    
    public void setAlertName(String alertName) {
        this.alertName = alertName;
    }
    
    public String getAlertType() {
        return alertType;
    }
    
    public void setAlertType(String alertType) {
        this.alertType = alertType;
    }
    
    public String getAlertState() {
        return alertState;
    }
    
    public void setAlertState(String alertState) {
        this.alertState = alertState;
    }
    
    public Long getAlertDuration() {
        return alertDuration;
    }
    
    public void setAlertDuration(Long alertDuration) {
        this.alertDuration = alertDuration;
    }
    
    public String getSeverity() {
        return severity;
    }
    
    public void setSeverity(String severity) {
        this.severity = severity;
    }
    
    public int getRequestCount() {
        return requestCount;
    }
    
    public void setRequestCount(int requestCount) {
        this.requestCount = requestCount;
    }
    
    public int getErrorCount() {
        return errorCount;
    }
    
    public void setErrorCount(int errorCount) {
        this.errorCount = errorCount;
    }
    
    public long getAverageResponseTime() {
        return averageResponseTime;
    }
    
    public void setAverageResponseTime(long averageResponseTime) {
        this.averageResponseTime = averageResponseTime;
    }
    
    public double getProcessCpuUsage() {
        return processCpuUsage;
    }
    
    public void setProcessCpuUsage(double processCpuUsage) {
        this.processCpuUsage = processCpuUsage;
    }
    
    public long getProcessMemoryUsage() {
        return processMemoryUsage;
    }
    
    public void setProcessMemoryUsage(long processMemoryUsage) {
        this.processMemoryUsage = processMemoryUsage;
    }
    
    public Double getTrafficRate() {
        return trafficRate;
    }
    
    public void setTrafficRate(Double trafficRate) {
        this.trafficRate = trafficRate;
    }
}
