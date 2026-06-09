import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "project")
os.chdir(ROOT)

port = int(os.environ.get("PORT", "8765"))
if len(sys.argv) > 1:
    port = int(sys.argv[1])

ThreadingHTTPServer.allow_reuse_address = True
with ThreadingHTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler) as httpd:
    print(f"Serving {ROOT} on port {port}")
    httpd.serve_forever()
