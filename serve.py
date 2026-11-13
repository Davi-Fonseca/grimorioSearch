#!/usr/bin/env python3
"""Servidor local de desenvolvimento: serve a pasta static/ SEM cache.

    python serve.py          # http://localhost:8080
    python serve.py 9000     # outra porta

O `python -m http.server` deixa o navegador guardar o index.html por um bom tempo, e as mudanças
parecem não aparecer. Este servidor manda "Cache-Control: no-store", então basta salvar e recarregar.
"""
import functools
import http.server
import sys
from pathlib import Path

STATIC = Path(__file__).parent / "static"


class SemCache(http.server.SimpleHTTPRequestHandler):
    # Módulos ES (<script type="module">) só funcionam se o servidor responder .js como JavaScript.
    # No Windows o Python lê o registro do sistema e às vezes devolve "text/plain", então fixamos os tipos.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = functools.partial(SemCache, directory=str(STATIC))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        print(f"Servindo {STATIC} em http://localhost:{port}  (sem cache; Ctrl+C para parar)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrado.")
