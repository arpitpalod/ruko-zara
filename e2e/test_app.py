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
    page.get_by_label("Change language / भाषा बदलें").first.click()
    page.get_by_text("Hinglish", exact=True).click()
    page.get_by_text("Vote karo", exact=True).wait_for()


def test_vote_reveals_results(page):
    """Results stay hidden until you vote, so the crowd's count doesn't sway you."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_text(re.compile("Vote to see what people said|No votes yet")).count() > 0
    page.get_by_text("Buy it", exact=True).first.click()
    page.get_by_text(re.compile(r"^\d+% say buy it$")).first.wait_for()


def test_results_tab(page):
    open_app(page, "English")
    page.get_by_text("Results", exact=True).click()
    page.get_by_text(re.compile(r"No results yet|Crowd says|% say buy it")).first.wait_for()


def test_post_arzi_asks_for_email_then_posts(page):
    open_app(page, "English")
    page.get_by_text("New request", exact=True).first.click()
    page.get_by_placeholder("e.g. Noise-cancelling headphones").fill("Test blender for smoothies")
    page.get_by_placeholder("e.g. 8999").fill("2499")
    page.get_by_placeholder("Need or want? What happened to the old one?").fill("Old one broke, I make smoothies daily")
    page.get_by_text("Send request", exact=True).click()
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
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r1")  # fresh load, like tapping the link in WhatsApp
    page.get_by_text("Share on WhatsApp").wait_for()
    assert page.get_by_label(re.compile("back", re.I)).count() > 0, "no back button on a shared link"
    page.get_by_text("Vote on more requests →").click()
    page.get_by_text("Results", exact=True).wait_for()   # exactly one feed, visible
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_text("Share on WhatsApp").count() == 0 or not page.get_by_text("Share on WhatsApp").is_visible()


def test_shared_link_header_back_goes_to_feed(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r2")
    page.get_by_text("Share on WhatsApp").wait_for()
    page.get_by_label(re.compile("back", re.I)).first.click()
    page.get_by_text("Results", exact=True).wait_for()


def test_interest_picker_puts_picks_first(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.get_by_text("Food", exact=True).first.click()
    page.get_by_text("Everything else", exact=True).wait_for()
    first_meta = page.get_by_text(re.compile(r"^(Gadgets|Fashion|Food|Beauty|Home|Travel|Fun|Other) · ")).first.inner_text()
    assert first_meta.startswith("Food"), first_meta
    page.reload()  # remembered on this device
    page.get_by_text("Everything else", exact=True).wait_for()


def test_english_mode_is_english(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    body = page.inner_text("body")
    assert "arzi" not in body, "Hinglish word in English mode: arzi"
    assert "1 opinions" not in body and "1 opinion" in body


def test_names_never_change_with_language(page):
    """A person's random name is their identity: the same in every language."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    names = re.findall(r"(?:Kanjoos|Bachat|Sasta|Samajhdar|Chillar|Hisaabi|Sabar) [A-Za-z]+ \d+", page.inner_text("body"))
    assert names, "expected the usual random names"
    page.get_by_label("Change language / भाषा बदलें").first.click()
    page.get_by_text("हिन्दी", exact=True).last.click()
    page.get_by_text("ले लो", exact=True).first.wait_for()
    assert names[0] in page.inner_text("body")


def test_page_shell_and_no_icon_font(page):
    """A placeholder shows before the app starts, and no 380 KB icon font is downloaded."""
    fonts = []
    page.on("request", lambda r: fonts.append(r.url) if r.url.endswith(".ttf") else None)
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert not [f for f in fonts if "Ionicons" in f], fonts
    html = page.request.get(page.url.split("#")[0]).text()
    assert 'class="boot"' in html and "preconnect" in html


def test_no_emojis_in_the_interface(page):
    """Icons, not emojis: emojis look different on every phone. (Shared WhatsApp messages may keep theirs.)"""
    emoji = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\u2705\u274C]")
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    for tab in ["Feed", "New request", "My requests"]:
        page.get_by_text(tab, exact=True).first.click()
        page.wait_for_timeout(400)
        body = page.inner_text("body")
        # user-written text (demo arzi and comments) may contain emojis; check the app's own words only
        own = [l for l in body.split("\n") if emoji.search(l) and not re.search(r"[a-z]{4,} [a-z]{4,} [a-z]{4,}", l.lower())]
        assert not own, f"emoji in the interface on {tab}: {own}"
