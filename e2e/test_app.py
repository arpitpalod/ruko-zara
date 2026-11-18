import re

from conftest import BASE, open_app


def test_language_picker_english(page):
    open_app(page, "English")
    page.get_by_text("Vote", exact=True).wait_for()
    page.get_by_text("Results", exact=True).wait_for()


def test_language_picker_hindi(page):
    open_app(page, "हिन्दी")
    page.get_by_text("वोट करें", exact=True).wait_for()
    page.get_by_text("फ़ैसले", exact=True).wait_for()


def test_language_picker_hinglish(page):
    open_app(page, "Hinglish")
    page.get_by_text("Vote karo", exact=True).wait_for()
    page.get_by_text("Faisle", exact=True).wait_for()


def test_language_button_switches_on_the_go(page):
    open_app(page, "English")
    page.get_by_text("Vote", exact=True).wait_for()
    page.get_by_text(re.compile(r"^🌐")).first.click()
    page.get_by_text("Hinglish", exact=True).click()
    page.get_by_text("Vote karo", exact=True).wait_for()


def first_count(page):
    txt = page.get_by_text(re.compile(r"^👍 \d+")).first.inner_text()
    return int(re.match(r"👍 (\d+)", txt).group(1))


def test_guest_can_vote_and_count_goes_up(page):
    open_app(page, "English")
    page.get_by_text("Buy it 👍").first.wait_for()
    before = first_count(page)
    page.get_by_text("Buy it 👍").first.click()
    page.wait_for_function(f"""() => {{
      const el = [...document.querySelectorAll('div')].find(d => /^👍 \\d+/.test(d.innerText || ''));
      return el && parseInt(el.innerText.match(/👍 (\\d+)/)[1]) >= {before + 1};
    }}""")
    assert first_count(page) >= before + 1


def test_results_tab(page):
    open_app(page, "English")
    page.get_by_text("Results", exact=True).click()
    page.get_by_text(re.compile(r"No results yet|👍 \d+")).first.wait_for()


def test_post_arzi_asks_for_email_then_posts(page):
    open_app(page, "English")
    page.get_by_text("New request", exact=True).first.click()
    page.get_by_placeholder("e.g. Noise-cancelling headphones").fill("Test blender for smoothies")
    page.get_by_placeholder("e.g. 8999").fill("2499")
    page.get_by_placeholder("Need or want? What happened to the old one?").fill("Old one broke, I make smoothies daily")
    page.get_by_text("Send request 🙏").click()
    # Not verified yet: the login screen opens, then the arzi posts by itself after verifying.
    page.get_by_placeholder("you@email.com").fill("tester@example.com")
    page.get_by_text("Send code", exact=True).click()
    page.get_by_placeholder("Code").fill("123456")
    page.get_by_text("Verify", exact=True).click()
    page.get_by_text("Test blender for smoothies").first.wait_for()
    assert "/request/" in page.url


def test_wrong_code_shows_error(page):
    open_app(page, "English")
    page.goto(BASE + "/login")
    page.get_by_placeholder("you@email.com").fill("tester@example.com")
    page.get_by_text("Send code", exact=True).click()
    page.get_by_placeholder("Code").fill("000000")
    page.get_by_text("Verify", exact=True).click()
    page.get_by_text(re.compile("123456")).first.wait_for()  # demo error message names the demo code


def test_whatsapp_share_sends_full_message(page):
    open_app(page, "Hinglish")
    page.get_by_text(re.compile(r"^₹")).first.click()  # open an arzi
    page.get_by_text("WhatsApp pe share karo").click()
    shared = page.evaluate("window.__shared")
    assert len(shared) == 1 and "url" not in shared[0], shared
    text = shared[0]["text"]
    assert "*" in text and "₹" in text and "/ruko-zara/request/" in text, text


def test_static_pages_exist(page, server):
    for path, must in [("/privacy.html", "Privacy"), ("/terms.html", "Terms"), ("/captcha.html", "rzTurnstileLoad")]:
        res = page.request.get(BASE + path)
        assert res.status == 200, path
        assert must in res.text(), path


def test_shared_link_lets_you_explore_more(page):
    """Someone opening a WhatsApp link lands on one arzi but can get to the rest."""
    open_app(page, "English")
    page.get_by_text("Buy it 👍").first.wait_for()
    page.goto(BASE + "/request/r1")  # fresh load, like tapping the link in WhatsApp
    page.get_by_text("Share on WhatsApp").wait_for()
    assert page.get_by_label(re.compile("back", re.I)).count() > 0, "no back button on a shared link"
    page.get_by_text("👀 Vote on more arzi →").click()
    page.get_by_text("Results", exact=True).wait_for()   # exactly one feed, visible
    page.get_by_text("Buy it 👍").first.wait_for()
    assert page.get_by_text("Share on WhatsApp").count() == 0 or not page.get_by_text("Share on WhatsApp").is_visible()


def test_shared_link_header_back_goes_to_feed(page):
    open_app(page, "English")
    page.get_by_text("Buy it 👍").first.wait_for()
    page.goto(BASE + "/request/r2")
    page.get_by_text("Share on WhatsApp").wait_for()
    page.get_by_label(re.compile("back", re.I)).first.click()
    page.get_by_text("Results", exact=True).wait_for()
