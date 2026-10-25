# Liten lokal server for å lage demovideoen:
# serverer mappen sin (recorder.html og bildene) og tar imot den ferdige videoen på POST /upload.
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        # /upload = den ferdige videoen, /preview = et kontrollbilde av én scene
        targets = {"/upload": OUT, "/preview": HERE / "preview.jpg"}
        target = targets.get(self.path)
        if target is None:
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0 or length > 50 * 1024 * 1024:
            self.send_error(400, "ugyldig størrelse")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(f"lagret {length} byte".encode())


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8090), Handler).serve_forever()
