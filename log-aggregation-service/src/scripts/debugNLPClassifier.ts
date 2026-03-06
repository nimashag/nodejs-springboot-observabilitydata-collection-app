import dotenv from "dotenv";
import { getConfiguredClassifier } from "../config/classifierLoader";
import { EventType } from "../types/eventTypes";

dotenv.config();

/**
 * Debug script to test the NLP classifier directly
 */
async function debugNLPClassifier() {
  console.log("=== NLP Classifier Debug ===\n");

  // Load the classifier
  const classifier = await getConfiguredClassifier();

  console.log(`Classifier name: ${classifier.name}`);
  console.log(`Is trained: ${classifier.isTrained()}`);
  console.log("");

  // Test with simple strings
  const testCases = [
    "error processing order",
    "http.request.received",
    "db.connected successfully",
    "order.create.success",
    "user login successful",
    "server.started",
    "org.mongodb.driver.cluster",
    "warning: memory high",
  ];

  console.log("Testing classification on simple strings:\n");

  for (const testCase of testCases) {
    try {
      const result = classifier.classify(testCase);
      const eventType = result instanceof Promise ? await result : result;
      console.log(`Input: "${testCase}"`);
      console.log(`Result: ${eventType}\n`);
    } catch (error) {
      console.log(`Input: "${testCase}"`);
      console.log(`Error: ${error}\n`);
    }
  }

  console.log("=== Testing with more detailed templates ===\n");

  const detailedTests = [
    "svc=restaurants-service | level=INFO | event=http.request.received",
    "svc=delivery-service | lvl=info | ev=db.connecting",
    "Error processing payment for order 456",
    "order.create.success orderId=789",
    "User john@example.com logged in successfully",
    "server.started port=3000",
  ];

  for (const testCase of detailedTests) {
    try {
      const result = classifier.classify(testCase);
      const eventType = result instanceof Promise ? await result : result;
      console.log(`Input: "${testCase.substring(0, 60)}..."`);
      console.log(`Result: ${eventType}\n`);
    } catch (error) {
      console.log(`Input: "${testCase.substring(0, 60)}..."`);
      console.log(`Error: ${error}\n`);
    }
  }

  // Check if the classifier has a process method (for node-nlp)
  if ("nlp" in classifier) {
    console.log("=== NLP Manager Details ===\n");
    const nlpClassifier = classifier as any;
    if (nlpClassifier.nlp && nlpClassifier.nlp.nluManager) {
      const nluManager = nlpClassifier.nlp.nluManager;
      console.log(`Locales: ${JSON.stringify(nluManager.locales)}`);

      if (nluManager.domainManagers && nluManager.domainManagers.en) {
        const domainManager = nluManager.domainManagers.en;
        console.log(`Domain manager exists: ${!!domainManager}`);
        console.log(
          `Settings: ${JSON.stringify(domainManager.settings, null, 2)}`,
        );
      }
    }
  }
}

debugNLPClassifier().catch(console.error);
