import json, re, hashlib
from pathlib import Path

RAW_DIR = Path("anomaly-ml/data/raw")
OUT_DIR = Path("anomaly-ml/data/processed/logs")
MERGED_OUT = Path("anomaly-ml/data/processed/logs.jsonl")

OUT_DIR.mkdir(parents=True, exist_ok=True)
MERGED_OUT.parent.mkdir(parents=True, exist_ok=True)

def safe_json_loads(s: str):
    try:
        return json.loads(s)
    except Exception:
        return None

def hash_stack(stack: str | None):
    if not stack:
        return None
    return hashlib.sha1(stack.encode("utf-8", errors="ignore")).hexdigest()[:12]

def normalize_base(obj: dict):
    """Ensure consistent ML-ready schema keys exist."""
    base = {
        "timestamp": obj.get("timestamp"),
        "service": obj.get("service"),
        "level": obj.get("level"),
        "event": obj.get("event"),

        "request_id": obj.get("request_id"),
        "session_id": obj.get("session_id"),

        "method": obj.get("method"),
        "path": obj.get("path"),
        "status_code": obj.get("status_code"),
        "duration_ms": obj.get("duration_ms"),

        "error_message": obj.get("error_message"),
        "error_type": obj.get("error_type"),
        "stacktrace_hash": obj.get("stacktrace_hash"),
    }
    return base

def parse_node_style(line: str, service_default: str):
    # svc=... | level=... | ts=... | event=... | data={...}
    parts = [p.strip() for p in line.split("|")]
    base = {}
    data_obj = {}

    for p in parts:
        if "=" not in p:
            continue
        k, v = p.split("=", 1)
        k, v = k.strip(), v.strip()
        if k == "data":
            data_obj = safe_json_loads(v) or {}
        else:
            base[k] = v

    out = {
        "timestamp": base.get("ts"),
        "service": base.get("svc") or service_default,
        "level": base.get("level"),
        "event": base.get("event"),

        "request_id": data_obj.get("requestId"),
        "session_id": data_obj.get("sessionId"),

        "method": data_obj.get("method"),
        "path": data_obj.get("path"),
        "status_code": data_obj.get("status"),
        "duration_ms": data_obj.get("durationMs"),

        "error_message": data_obj.get("error"),
        "error_type": None,
        "stacktrace_hash": None,
    }

    stack = data_obj.get("stack")
    if isinstance(stack, str) and stack:
        m = re.match(r"^([A-Za-z0-9_]+):", stack.strip())
        out["error_type"] = m.group(1) if m else None
        out["stacktrace_hash"] = hash_stack(stack)

    return normalize_base(out)

def parse_delivery_style(line: str, service_default: str):
    # DELIVERY|ts=...|lvl=info|ev=...|ctx={...}
    # also handle mixed garbage by extracting only the DELIVERY portion
    # If the line contains "DELIVERY|" but has extra text after ctx json, we still parse first part.
    if "DELIVERY|" not in line:
        return None

    # keep only from DELIVERY| onwards
    line = line[line.index("DELIVERY|"):].strip()

    segments = line.split("|")
    base = {"service": service_default}  # default
    ctx_obj = {}

    for seg in segments:
        seg = seg.strip()
        if seg == "DELIVERY":
            base["service"] = "delivery-service"
            continue
        if "=" not in seg:
            continue
        k, v = seg.split("=", 1)
        k, v = k.strip(), v.strip()

        if k == "ts":
            base["timestamp"] = v
        elif k == "lvl":
            base["level"] = v.upper()
        elif k == "ev":
            base["event"] = v
        elif k == "ctx":
            # ctx is json - but might be followed by extra text, so extract json part only
            m = re.search(r"(\{.*\})", v)
            if m:
                ctx_obj = safe_json_loads(m.group(1)) or {}
            else:
                ctx_obj = {}

    out = {
        "timestamp": base.get("timestamp"),
        "service": base.get("service") or service_default,
        "level": base.get("level"),
        "event": base.get("event"),

        "request_id": ctx_obj.get("requestId"),
        "session_id": ctx_obj.get("sessionId"),

        "method": ctx_obj.get("method"),
        "path": ctx_obj.get("path"),
        "status_code": ctx_obj.get("status") or ctx_obj.get("statusCode"),
        "duration_ms": ctx_obj.get("durationMs") or ctx_obj.get("duration"),

        "error_message": ctx_obj.get("error"),
        "error_type": None,
        "stacktrace_hash": None,
    }

    stack = ctx_obj.get("stack")
    if isinstance(stack, str) and stack:
        m = re.match(r"^([A-Za-z0-9_]+):", stack.strip())
        out["error_type"] = m.group(1) if m else None
        out["stacktrace_hash"] = hash_stack(stack)

    return normalize_base(out)

def parse_spring_style(line: str, service_default: str):
    # Example:
    # 2025-12-27 12:03:41.029 INFO  [users-service] [main] ... - message
    spring_re = re.compile(
        r"^(?P<date>\d{4}-\d{2}-\d{2})\s+(?P<time>\d{2}:\d{2}:\d{2}\.\d{3})\s+"
        r"(?P<level>[A-Z]+)\s+\[(?P<service>[^\]]+)\]\s+\[(?P<thread>[^\]]+)\]\s+"
        r"(?P<logger>[^ ]+)\s+-\s+(?P<message>.*)$"
    )
    m = spring_re.match(line.strip())
    if not m:
        return None

    timestamp = f"{m.group('date')}T{m.group('time')}"  # local naive, ok for now
    out = {
        "timestamp": timestamp,
        "service": m.group("service") or service_default,
        "level": m.group("level"),
        "event": "app.log",  # spring logs don't have explicit event names
        "request_id": None,
        "session_id": None,
        "method": None,
        "path": None,
        "status_code": None,
        "duration_ms": None,
        "error_message": m.group("message"),
        "error_type": None,
        "stacktrace_hash": None,
    }
    return normalize_base(out)

def is_valid(obj: dict):
    if not obj.get("timestamp"):
        return False
    if not obj.get("service"):
        return False
    # keep if at least one of these exists
    if not obj.get("event") and not obj.get("level") and not obj.get("error_message"):
        return False
    return True

def parse_any(line: str, service_default: str):
    line = line.rstrip("\n")
    if not line.strip():
        return None

    # already JSON line?
    if line.strip().startswith("{") and line.strip().endswith("}"):
        obj = safe_json_loads(line.strip())
        if isinstance(obj, dict):
            # map common fields
            out = {
                "timestamp": obj.get("timestamp") or obj.get("ts") or obj.get("time"),
                "service": obj.get("service") or obj.get("svc") or service_default,
                "level": (obj.get("level") or obj.get("lvl")),
                "event": obj.get("event") or obj.get("ev") or obj.get("msg") or obj.get("message"),
                "request_id": obj.get("request_id") or obj.get("requestId"),
                "session_id": obj.get("session_id") or obj.get("sessionId"),
                "method": obj.get("method"),
                "path": obj.get("path") or obj.get("url"),
                "status_code": obj.get("status_code") or obj.get("status"),
                "duration_ms": obj.get("duration_ms") or obj.get("durationMs"),
                "error_message": obj.get("error") or obj.get("error_message"),
                "error_type": obj.get("error_type"),
                "stacktrace_hash": obj.get("stacktrace_hash"),
            }
            # normalize level casing if present
            if isinstance(out.get("level"), str):
                out["level"] = out["level"].upper()
            return normalize_base(out)

    # detect formats
    if "svc=" in line and "| event=" in line:
        return parse_node_style(line, service_default)
    if "DELIVERY|" in line:
        return parse_delivery_style(line, service_default)

    # try spring
    spring_obj = parse_spring_style(line, service_default)
    if spring_obj:
        return spring_obj

    return None

def main():
    if MERGED_OUT.exists():
        MERGED_OUT.unlink()

    total_written = 0
    total_skipped = 0

    for raw_file in sorted(RAW_DIR.glob("*.log")):
        service_default = raw_file.stem
        out_file = OUT_DIR / (raw_file.stem + ".jsonl")

        written = 0
        skipped = 0

        with raw_file.open("r", encoding="utf-8", errors="ignore") as fin, \
             out_file.open("w", encoding="utf-8") as fout, \
             MERGED_OUT.open("a", encoding="utf-8") as fmerged:

            for line in fin:
                obj = parse_any(line, service_default)
                if not obj or not is_valid(obj):
                    skipped += 1
                    continue

                s = json.dumps(obj, ensure_ascii=False)
                fout.write(s + "\n")
                fmerged.write(s + "\n")
                written += 1

        total_written += written
        total_skipped += skipped
        print(f"✅ {raw_file.name}: wrote={written}, skipped={skipped}")

    print(f"\n✅ Merged output: {MERGED_OUT}")
    print(f"✅ Total written: {total_written}")
    print(f"⚠️ Total skipped: {total_skipped}")

if __name__ == "__main__":
    main()
