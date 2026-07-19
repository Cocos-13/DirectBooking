import { siteConfig } from "@/content/siteConfig";

// Minimal server-rendered HTML for the owner-only action pages reached from
// signed email links (approve, deposit send/resolve). No client JS, no styling
// framework — these are rare, owner-facing utility pages.

export function escHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ownerPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${escHtml(title)} — ${escHtml(siteConfig.name)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#1f2d2b;line-height:1.5}
        h1{font-size:22px}
        table{border-collapse:collapse;margin:16px 0;width:100%}
        td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
        td:first-child{color:#888;width:110px}
        button{background:#c65a3a;color:#fff;border:0;border-radius:9999px;padding:12px 22px;font-weight:600;font-size:15px;cursor:pointer;margin-top:8px}
        button.secondary{background:#2a6570}
        input[type=number]{padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:15px;width:120px}
        form{margin:14px 0}
        a{color:#2a6570;word-break:break-all}
        .muted{color:#888;font-size:13px}
        .warn{color:#b04a2f}
      </style></head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
