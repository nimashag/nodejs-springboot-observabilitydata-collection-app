@RestController
@RequestMapping("/debug")
public class DebugController {

    private boolean enabled() {
        return "true".equalsIgnoreCase(System.getenv("ENABLE_DEBUG_ROUTES"));
    }

    @GetMapping("/slow")
    public ResponseEntity<?> slow(@RequestParam(defaultValue = "800") long ms) throws InterruptedException {
        if (!enabled()) return ResponseEntity.notFound().build();
        Thread.sleep(ms);
        return ResponseEntity.ok(Map.of("ok", true, "delay_ms", ms));
    }

    @GetMapping("/fail")
    public ResponseEntity<?> fail() {
        if (!enabled()) return ResponseEntity.notFound().build();
        return ResponseEntity.status(500).body(Map.of("ok", false, "error", "forced_failure"));
    }

    @GetMapping("/mix")
    public ResponseEntity<?> mix() throws InterruptedException {
        if (!enabled()) return ResponseEntity.notFound().build();
        if (Math.random() > 0.5) return ResponseEntity.status(500).build();
        Thread.sleep(400);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}