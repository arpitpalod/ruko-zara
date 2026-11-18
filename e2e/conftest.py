"""Browser tests for the web app in demo mode (no live database).

Builds are served from DIST (default: ./dist-demo) with a tiny local server that sends unknown paths
to index.html, like GitHub Pages' 404 fallback.
"""
import functools
import http.server
import os
import threading

import pytest
from playwright.sync_api import sync_playwright

DIST = os.path.abspath(os.environ.get("DIST", "dist-demo"))
PORT = int(os.environ.get("E2E_PORT", "8787"))
BASE = f"http://127.0.0.1:{PORT}"
IPHONE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1"
)


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path.split("?", 1)[0])
        if not os.path.exists(path):
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def server():
    assert os.path.isfile(os.path.join(DIST, "index.html")), f"No web build in {DIST}"
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(SpaHandler, directory=DIST))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield BASE
    httpd.shutdown()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture
def page(browser, server):
    """A fresh phone-sized browser (no saved language, no saved login) for every test."""
    ctx = browser.new_context(user_agent=IPHONE_UA, viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    ctx.add_init_script("window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); };")
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.set_default_timeout(15000)
    yield pg
    ctx.close()
    assert not errors, f"JavaScript errors on the page: {errors[:3]}"


def open_app(page, language="English"):
    page.goto(BASE + "/")
    page.get_by_text(language, exact=True).click()
    return page
