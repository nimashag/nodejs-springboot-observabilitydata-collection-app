import { execSync } from "child_process";

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  run("node pull-telemetry.js");
  run("node discovery-report.js");
  run("node kpi-coverage-checker.js");
  run("node signal-detector.js --samples=5 --intervalMs=1200");
  run("node final-report.js");
  console.log("\n DONE: final_agent_report.json + kpi_coverage_report.json generated");
}

main();
