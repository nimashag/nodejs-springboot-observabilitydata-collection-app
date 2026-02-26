export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, obj: unknown) {
  downloadText(filename, JSON.stringify(obj, null, 2));
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  if (!rows.length) return downloadText(filename, "");

  // ✅ simpler + TS-safe header extraction
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
  ];

  downloadText(filename, lines.join("\n"));
}
