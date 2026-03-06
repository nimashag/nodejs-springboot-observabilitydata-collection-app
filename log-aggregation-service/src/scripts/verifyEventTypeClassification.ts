import dotenv from "dotenv";
import { LogTemplateMiner } from "../services/templateMiner";

dotenv.config();

/**
 * Verification script to check if event type classification is working
 */
async function verifyEventTypeClassification() {
  console.log("=== Event Type Classification Verification ===\n");

  const templateMiner = new LogTemplateMiner();

  // Wait for classifier to initialize
  await templateMiner.initializeClassifier();
  console.log("✓ Classifier initialized\n");

  // Sample logs representing different event types
  const testLogs = [
    // HTTP requests
    'svc=restaurants-service | level=INFO | ts=2025-12-31T10:30:45.123Z | event=http.request.received | data={method:"GET"}',
    "GET /api/orders/123 200 OK",

    // Database operations
    "svc=delivery-service | lvl=info | ev=db.connecting | uri=mongodb://localhost",
    "SELECT * FROM users WHERE id=123",
    "db.connected successfully",

    // Errors
    "Error processing payment for order 456",
    "Exception: NullPointerException at line 123",
    "Failed to connect to database",

    // Business logic
    "order.create.success orderId=789",
    "restaurant.list.success count=15",
    "payment.mark_as_paid.success orderId=456",

    // Authentication
    "User john@example.com logged in successfully",
    "Login failed for user invalid@test.com",

    // Server lifecycle
    "server.started port=3000",
    "Server started successfully on port 8080",

    // Infrastructure
    "org.mongodb.driver.cluster - Monitor thread connected successfully",
    "org.springframework.web.servlet.DispatcherServlet initialized",
  ];

  console.log("Mining templates from test logs...\n");

  const result = await templateMiner.mineTemplates(
    testLogs,
    "test-service",
    1, // minClusterSize (smaller for test)
    testLogs.length, // maxClusters
  );

  console.log(`✓ Mined ${result.templates.length} templates\n`);

  // Display templates with their event types
  console.log("=== Templates and Event Types ===\n");

  let unknownCount = 0;
  let classifiedCount = 0;

  result.templates.forEach((template, idx) => {
    const eventType = template.eventType || "unknown";
    const isUnknown = eventType === "unknown";
    if (isUnknown) {
      unknownCount++;
    } else {
      classifiedCount++;
    }

    const emoji = isUnknown ? "❌" : "✅";
    console.log(`${emoji} Template ${idx + 1}:`);
    console.log(`   Event Type: ${eventType}`);
    console.log(`   Template: ${template.template.substring(0, 80)}...`);
    console.log(`   Example: ${template.exampleLogs[0].substring(0, 80)}...`);
    console.log("");
  });

  console.log("=== Summary ===\n");
  console.log(`Total templates: ${result.templates.length}`);
  console.log(
    `✅ Properly classified: ${classifiedCount} (${((classifiedCount / result.templates.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `❌ Unknown: ${unknownCount} (${((unknownCount / result.templates.length) * 100).toFixed(1)}%)`,
  );
  console.log("");

  // Count by event type
  const eventTypeCounts = new Map<string, number>();
  result.templates.forEach((t) => {
    const eventType = t.eventType || "unknown";
    eventTypeCounts.set(eventType, (eventTypeCounts.get(eventType) || 0) + 1);
  });

  console.log("Event type distribution:");
  Array.from(eventTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([eventType, count]) => {
      console.log(`  ${eventType}: ${count}`);
    });

  console.log("");

  // Verify the fix
  if (unknownCount === result.templates.length) {
    console.log('❌ ISSUE FOUND: All templates are classified as "unknown"');
    console.log("   This indicates the async fix may not be working properly.");
  } else if (unknownCount > classifiedCount) {
    console.log('⚠️  WARNING: More than half of templates are "unknown"');
    console.log("   The model may need better training data.");
  } else {
    console.log("✅ SUCCESS: Event type classification is working!");
    console.log("   Most templates have proper event types assigned.");
  }

  console.log("\n=== Verification Complete ===\n");
}

verifyEventTypeClassification().catch(console.error);
