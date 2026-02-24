import { useState } from "react";
import MetricSettings from "./Settings";
import "./metricAgent.css";

type AppSettings = {
  pollingEnabled: boolean;
  intervals: {
    healthMs: number;
    signalsMs: number;
    kpiMs: number;
    planMs: number;
    promMs: number;
  };
  ui: { defaultPromView: "raw" | "structured" };
};

const defaults: AppSettings = {
  pollingEnabled: true,
  intervals: {
    healthMs: 3000,
    signalsMs: 2500,
    kpiMs: 5000,
    planMs: 9000,
    promMs: 12000,
  },
  ui: { defaultPromView: "raw" },
};

export default function MetricSettingsWrapper() {
  const [settings, setSettings] = useState<AppSettings>(defaults);

  return (
    <MetricSettings
      settings={settings}
      onChange={setSettings}
      onJump={() => {}}
      onResetDefaults={() => setSettings(defaults)}
    />
  );
}