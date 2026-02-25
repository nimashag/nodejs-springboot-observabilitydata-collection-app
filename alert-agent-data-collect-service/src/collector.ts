import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import { AlertEvent, NormalizedAlertEvent } from "./types";

export class AlertDataCollector {
  private serviceAlertFiles: Map<string, string> = new Map();
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private lastPositions: Map<string, number> = new Map();
  private onNewAlertCallback?: (alert: NormalizedAlertEvent) => void;

  constructor() {
    // Support both local development and Docker environments
    // In Docker, alert files are mounted at /app/alerts/<service-name>/
    // In local dev, they're at ../service-name/alerts/
    const isDocker =
      process.env.DOCKER_ENV === "true" || fs.existsSync("/app/alerts");
    const alertBasePath = isDocker ? "/app/alerts" : "..";

    console.log(
      `[INIT] Environment: ${isDocker ? "Docker" : "Local"}, Alert base path: ${alertBasePath}`,
    );

    if (isDocker) {
      // Docker paths: /app/alerts/<service>/<service>-alert-data.ndjson
      this.serviceAlertFiles.set(
        "delivery-service",
        `${alertBasePath}/delivery-service/delivery-service-alert-data.ndjson`,
      );
      this.serviceAlertFiles.set(
        "orders-service",
        `${alertBasePath}/orders-service/orders-service-alert-data.ndjson`,
      );
      this.serviceAlertFiles.set(
        "restaurants-service",
        `${alertBasePath}/restaurants-service/restaurants-service-alert-data.ndjson`,
      );
      this.serviceAlertFiles.set(
        "users-service",
        `${alertBasePath}/users-service/users-service-alert-data.ndjson`,
      );
    } else {
      // Local dev paths: ../service-name/alerts/service-name-alert-data.ndjson
      this.serviceAlertFiles.set(
        "delivery-service",
        "../delivery-service/alerts/delivery-service-alert-data.ndjson",
      );
      this.serviceAlertFiles.set(
        "orders-service",
        "../orders-service/alerts/orders-service-alert-data.ndjson",
      );
      this.serviceAlertFiles.set(
        "restaurants-service",
        "../restaurants-service/alerts/restaurants-service-alert-data.ndjson",
      );
      this.serviceAlertFiles.set(
        "users-service",
        "../users-service/alerts/users-service-alert-data.ndjson",
      );
    }
  }

  /**
   * Read alert events from a single service file
   */
  private readServiceAlertFile(
    serviceName: string,
    filePath: string,
  ): AlertEvent[] {
    // Handle absolute vs relative paths
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(__dirname, "..", filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`${serviceName}: file not found (${fullPath})`);
      return [];
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      const events: AlertEvent[] = [];
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as AlertEvent;
          events.push(event);
        } catch (err) {
          console.error(`${serviceName}: parse error`);
        }
      }

      console.log(`${serviceName}: ${events.length} alerts`);
      return events;
    } catch (err) {
      console.error(`${serviceName}: read error`);
      return [];
    }
  }

  /**
   * Normalize an alert event
   */
  public normalizeAlertEvent(event: AlertEvent): NormalizedAlertEvent {
    const serviceType =
      event.service_name === "users-service" ? "java" : "nodejs";
    const normalizedTimestamp = new Date(event.timestamp).getTime();

    return {
      ...event,
      normalized_timestamp: normalizedTimestamp,
      service_type: serviceType,
    };
  }

  /**
   * Collect and merge alert data from all services
   */
  public collectAllAlerts(): NormalizedAlertEvent[] {
    const allAlerts: NormalizedAlertEvent[] = [];

    for (const [serviceName, filePath] of this.serviceAlertFiles.entries()) {
      const serviceAlerts = this.readServiceAlertFile(serviceName, filePath);

      for (const alert of serviceAlerts) {
        const normalized = this.normalizeAlertEvent(alert);
        allAlerts.push(normalized);
      }
    }

    allAlerts.sort((a, b) => a.normalized_timestamp - b.normalized_timestamp);

    console.log(`Total alerts: ${allAlerts.length}`);
    return allAlerts;
  }

  /**
   * Generate summary statistics
   */
  public generateSummary(alerts: NormalizedAlertEvent[]): any {
    const summary = {
      total_alerts: alerts.length,
      alerts_by_service: {} as { [key: string]: number },
      alerts_by_type: {} as { [key: string]: number },
      alerts_by_severity: {} as { [key: string]: number },
      alerts_by_state: {} as { [key: string]: number },
      collection_timestamp: new Date().toISOString(),
    };

    for (const alert of alerts) {
      summary.alerts_by_service[alert.service_name] =
        (summary.alerts_by_service[alert.service_name] || 0) + 1;

      summary.alerts_by_type[alert.alert_type] =
        (summary.alerts_by_type[alert.alert_type] || 0) + 1;

      summary.alerts_by_severity[alert.severity] =
        (summary.alerts_by_severity[alert.severity] || 0) + 1;

      summary.alerts_by_state[alert.alert_state] =
        (summary.alerts_by_state[alert.alert_state] || 0) + 1;
    }

    return summary;
  }

  /**
   * Write combined alert history to file
   */
  public writeCombinedAlertHistory(
    alerts: NormalizedAlertEvent[],
    outputPath: string,
  ): void {
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const json = JSON.stringify(alerts, null, 2);
      fs.writeFileSync(outputPath, json, "utf-8");
    } catch (err) {
      console.error(`Failed to write alert history: ${err}`);
    }
  }

  /**
   * Write summary to file
   */
  public writeSummary(summary: any, outputPath: string): void {
    try {
      const json = JSON.stringify(summary, null, 2);
      fs.writeFileSync(outputPath, json, "utf-8");
    } catch (err) {
      console.error(`Failed to write summary: ${err}`);
    }
  }

  /**
   * Start watching alert files in real-time (like log enrichment service)
   */
  public startRealTimeCollection(
    onNewAlert: (alert: NormalizedAlertEvent) => void,
  ): void {
    this.onNewAlertCallback = onNewAlert;

    for (const [serviceName, filePath] of this.serviceAlertFiles.entries()) {
      // Handle absolute vs relative paths
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(__dirname, "..", filePath);

      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (!fs.existsSync(fullPath)) {
        if (fs.existsSync(dirPath)) {
          const dirWatcher = chokidar.watch(dirPath, {
            persistent: true,
            ignoreInitial: true,
          });

          dirWatcher.on("add", (file) => {
            if (
              file === fullPath ||
              path.basename(file).includes(serviceName)
            ) {
              this.watchAlertFile(serviceName, fullPath);
            }
          });
        }
        console.log(
          `[REAL-TIME] Waiting for ${serviceName} alert file to be created`,
        );
        continue;
      }

      this.watchAlertFile(serviceName, fullPath);
    }
  }

  /**
   * Watch a specific alert file for changes
   */
  private watchAlertFile(serviceName: string, filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      this.lastPositions.set(serviceName, stats.size);
    } catch (err) {
      this.lastPositions.set(serviceName, 0);
    }

    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    watcher.on("change", () => {
      this.processNewAlerts(serviceName, filePath);
    });

    watcher.on("add", () => {
      this.processNewAlerts(serviceName, filePath);
    });

    watcher.on("error", (error: Error) => {
      console.error(`[REAL-TIME] Error watching ${serviceName}:`, error);
    });

    this.watchers.set(serviceName, watcher);
    console.log(
      `[REAL-TIME] Started watching ${serviceName} alerts at ${filePath}`,
    );
  }

  /**
   * Process new alerts from a file (incremental reading)
   */
  private processNewAlerts(serviceName: string, filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const stats = fs.statSync(filePath);
      const lastPos = this.lastPositions.get(serviceName) || 0;

      if (stats.size <= lastPos) {
        return;
      }

      const fileHandle = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(stats.size - lastPos);
      fs.readSync(fileHandle, buffer, 0, buffer.length, lastPos);
      fs.closeSync(fileHandle);

      const newContent = buffer.toString("utf-8");
      const lines = newContent
        .trim()
        .split("\n")
        .filter((l) => l.length > 0);

      let processedCount = 0;
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as AlertEvent;
          const normalized = this.normalizeAlertEvent(event);

          if (this.onNewAlertCallback) {
            this.onNewAlertCallback(normalized);
            processedCount++;
          }
        } catch (err) {
          console.error(`[REAL-TIME] Parse error for ${serviceName}:`, err);
        }
      }

      if (processedCount > 0) {
        console.log(
          `[REAL-TIME] Processed ${processedCount} new alerts from ${serviceName}`,
        );
      }

      this.lastPositions.set(serviceName, stats.size);
    } catch (err) {
      console.error(
        `[REAL-TIME] Error processing new alerts from ${serviceName}:`,
        err,
      );
    }
  }

  /**
   * Stop watching alert files
   */
  public stopRealTimeCollection(): void {
    for (const [serviceName, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(`[REAL-TIME] Stopped watching ${serviceName}`);
    }
    this.watchers.clear();
    this.lastPositions.clear();
  }
}
