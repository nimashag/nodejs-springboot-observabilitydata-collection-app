export type PromMetricLine = { kind: "metric" | "comment"; text: string };
export type PromRouteBlock = {
  service: string;
  routeLine: string; // "# Route: DELETE /api/... (intent=..., conf=...)"
  method?: string;
  path?: string;
  intent?: string;
  conf?: string;
  lines: PromMetricLine[];
};

export function parsePromSuggestions(raw: string): PromRouteBlock[] {
  const lines = raw.split(/\r?\n/);

  let currentService = "unknown-service";
  let currentRoute: PromRouteBlock | null = null;
  const blocks: PromRouteBlock[] = [];

  const flush = () => {
    if (currentRoute) blocks.push(currentRoute);
    currentRoute = null;
  };

  for (const line of lines) {
    const s = line.trimEnd();

    // Service header: "# --- restaurants-service ---"
    const svcMatch = s.match(/^#\s*---\s*(.+?)\s*---\s*$/);
    if (svcMatch) {
      flush();
      currentService = svcMatch[1].trim();
      continue;
    }

    // Route line: "# Route: DELETE /api/... (intent=..., conf=...)"
    const routeMatch = s.match(/^#\s*Route:\s*(.+)$/);
    if (routeMatch) {
      flush();
      const routeLine = routeMatch[1];

      // try extract method/path + intent/conf
      const mp = routeLine.match(
        /^(\w+)\s+(\S+)\s+\(intent=([^,]+),\s*conf=([^)]+)\)/,
      );
      currentRoute = {
        service: currentService,
        routeLine: `# Route: ${routeLine}`,
        method: mp?.[1],
        path: mp?.[2],
        intent: mp?.[3],
        conf: mp?.[4],
        lines: [],
      };
      continue;
    }

    // Ignore top header noise unless inside a route
    if (!currentRoute) continue;

    if (!s) {
      // blank line ends a block visually, but keep it optional
      continue;
    }

    const isComment = s.trimStart().startsWith("#");
    currentRoute.lines.push({
      kind: isComment ? "comment" : "metric",
      text: s.trim(),
    });
  }

  flush();
  return blocks;
}
