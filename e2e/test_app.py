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
    page.get_by_text("Worth the price", exact=True).click()   # the reason is the second tap
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
    page.get_by_text("Goa trip with college friends").click()  # open an arzi
    page.get_by_text("WhatsApp pe share karo").click()
    shared = page.evaluate("window.__shared")
    assert len(shared) == 1 and "url" not in shared[0], shared
    text = shared[0]["text"]
    assert "*" in text and "₹" in text and "/ruko-zara/request/" in text, text
    assert "?src=wa&lang=hinglish" in text, text  # so we can count who comes back through WhatsApp


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
    assert page.get_by_test_id("all-requests").count() > 0, "no way back to the feed on a shared link"
    page.get_by_text("Vote on more requests →").click()
    page.get_by_text("Results", exact=True).wait_for()   # exactly one feed, visible
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_text("Share on WhatsApp").count() == 0 or not page.get_by_text("Share on WhatsApp").is_visible()


def test_shared_link_header_back_goes_to_feed(page):
    """On an arzi opened from a shared link, back says where it goes (21 Nov)."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r2")
    page.get_by_text("Share on WhatsApp").wait_for()
    page.get_by_test_id("all-requests").click()
    page.get_by_text("Results", exact=True).wait_for()


def test_shared_link_skips_language_screen(page):
    """A WhatsApp link opens the arzi straight away in the sharer's language; the feed then asks interests once."""
    page.goto(BASE + "/request/r2?src=wa&lang=hi")
    page.get_by_text("सारी अर्ज़ियाँ", exact=True).wait_for()
    assert page.get_by_text("Choose your language · अपनी भाषा चुनें").count() == 0
    page.get_by_test_id("all-requests").click()
    page.get_by_text("आप क्या-क्या ख़रीदते हैं?", exact=True).wait_for()
    page.get_by_test_id("intro-go").click()
    page.get_by_text("पहले दिखाएँ", exact=True).wait_for()


def test_first_visit_picks_order_the_feed(page):
    """Language, then "What do you shop for?" in that language; picks come first, nothing is hidden."""
    page.goto(BASE + "/")
    page.get_by_text("English", exact=True).click()
    page.get_by_text("What do you shop for?", exact=True).wait_for()
    page.get_by_test_id("intro-Khana").click()
    page.get_by_text("Show my feed", exact=True).click()
    page.get_by_text("Everything else", exact=True).wait_for()
    first_meta = page.get_by_text(re.compile(r"^(Gadgets|Fashion|Food|Beauty|Home|Travel|Fun|Health|Other) · ")).first.inner_text()
    assert first_meta.startswith("Food"), first_meta
    page.reload()  # asked once only
    page.get_by_text("Everything else", exact=True).wait_for()
    assert page.get_by_text("What do you shop for?").count() == 0


def test_interest_picker_puts_picks_first(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.get_by_text("Health", exact=True).first.wait_for()  # added 21 Nov
    page.get_by_text("Food", exact=True).first.click()
    page.get_by_text("Everything else", exact=True).wait_for()
    first_meta = page.get_by_text(re.compile(r"^(Gadgets|Fashion|Food|Beauty|Home|Travel|Fun|Health|Other) · ")).first.inner_text()
    assert first_meta.startswith("Food"), first_meta
    page.reload()  # remembered on this device
    page.get_by_text("Everything else", exact=True).wait_for()


def test_votes_pick_show_first(page):
    """From 3 votes on, 'Show first' follows what you vote on, until you pick yourself (21 Nov)."""
    hint = "Picked from your votes. Tap to change."
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_text(hint).count() == 0
    for i in range(3):
        page.get_by_text("Buy it", exact=True).nth(i).click()
        page.get_by_text("Worth the price", exact=True).first.click()
        page.get_by_text(re.compile(r"^\d+% say buy it$")).nth(i).wait_for()
        page.wait_for_timeout(500)  # the demo saves a vote after a short delay
    assert page.get_by_text(hint).count() == 0, "cards reordered mid-voting"
    page.get_by_text("Results", exact=True).click()
    page.get_by_text(re.compile(r"No results yet|Crowd says|% say buy it")).first.wait_for()
    page.get_by_text("Vote", exact=True).click()
    page.get_by_text(re.compile(r"^You voted \(3\)")).wait_for()
    page.get_by_text(hint).wait_for()
    page.get_by_text("All", exact=True).click()  # their own choice from now on
    page.get_by_text(hint).wait_for(state="detached")


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


def test_verified_voters_not_shown_yet(page):
    """Verified votes are counted but not shown until Arpit says so (18 Nov)."""
    open_app(page, "English")
    page.get_by_text("Results", exact=True).click()
    page.get_by_text(re.compile(r"% say buy it$")).first.wait_for()
    assert "Verified voters" not in page.inner_text("body")


def test_vote_needs_a_reason(page):
    """Buy it / Skip it opens that side's reasons; the vote counts only once a reason is picked (18 Nov)."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.click()
    for r in ("You need it", "Worth the price", "Treat yourself"):
        page.get_by_text(r, exact=True).wait_for()
    assert page.get_by_text("Wait for a sale", exact=True).count() == 0, "Skip reasons shown for Buy it"
    assert page.get_by_text(re.compile(r"^\d+% say buy it$")).count() == 0, "results shown before a reason was picked"
    page.get_by_text("Skip it", exact=True).first.click()           # switch sides: the other reasons
    for r in ("Don't need it", "Wait for a sale", "Cheaper option exists", "Too much for this"):
        page.get_by_text(r, exact=True).wait_for()
    assert page.get_by_text("Treat yourself", exact=True).count() == 0
    page.get_by_text("Skip it", exact=True).first.click()           # tap again: closes, still no vote
    page.get_by_text("Wait for a sale", exact=True).wait_for(state="detached")
    assert page.get_by_text(re.compile(r"^\d+% say buy it$")).count() == 0


def test_reasons_tally_after_voting(page):
    """On the arzi page, once you've voted, you see why people voted, your reason included."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r1")
    page.get_by_text("Share on WhatsApp").wait_for()
    assert page.get_by_text("Why people voted").count() == 0, "reasons shown before voting"
    page.get_by_text("Skip it", exact=True).click()
    page.get_by_text("Wait for a sale", exact=True).click()
    tally = page.get_by_test_id("reason-tally")
    tally.wait_for()
    text = tally.inner_text()
    assert "Why people voted" in text and "Wait for a sale" in text and "Don't need it" in text, text
    # Votes from before reasons existed have none: the tally says how many votes it covers.
    assert re.search(r"From \d+ of \d+ votes", text), text


def test_reasons_in_hinglish(page):
    open_app(page, "Hinglish")
    page.get_by_text("Le le", exact=True).first.click()
    page.get_by_text("Zaroorat hai", exact=True).wait_for()
    page.get_by_text("Rehne de", exact=True).first.click()
    page.get_by_text("Sale ka wait karo", exact=True).wait_for()


def test_my_requests_has_post_button(page):
    open_app(page, "English")
    page.get_by_text("My requests", exact=True).click()
    page.get_by_text(re.compile("^Verify email")).wait_for()   # My requests is open
    page.get_by_test_id("mine-post").click()
    page.get_by_text("What do you want to buy?").wait_for()


def test_hidden_posts_reach_nobody_but_admins(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    body = page.inner_text("body")
    assert "Something reported three times" not in body and "Spam from a banned account" not in body
    page.get_by_text("My requests", exact=True).click()
    page.get_by_text(re.compile("^Verify email")).wait_for()   # My requests is open
    assert page.get_by_text(re.compile("Hidden and banned posts")).count() == 0, "admin link shown to a non-admin"


def test_admin_hidden_posts_out_of_feed(page):
    """Admins: hidden and banned people's arzi stay out of the feed, on their own page (19 Nov)."""
    page.goto(BASE + "/?admin=1")
    page.get_by_text("English", exact=True).click()
    page.get_by_test_id("intro-go").click()  # skip "What do you shop for?"
    page.get_by_text("Buy it", exact=True).first.wait_for()
    body = page.inner_text("body")
    assert "Something reported three times" not in body and "Spam from a banned account" not in body, "hidden arzi in the admin feed"
    page.get_by_text("Results", exact=True).click()
    page.get_by_text(re.compile(r"% say buy it$")).first.wait_for()
    assert "Spam from a banned account" not in page.inner_text("body")
    page.get_by_text("My requests", exact=True).click()
    page.get_by_text("Hidden and banned posts (2)").click()
    page.get_by_text("Something reported three times").wait_for()
    page.get_by_text("Spam from a banned account").wait_for()
    page.get_by_text(re.compile("^Hidden \\(only admins")).wait_for()
    page.get_by_text(re.compile("^Banned")).wait_for()


def test_savings_always_on_top(page):
    """One constant thing on top of Feed and New request: savings. Big at the top, slim once you scroll."""
    page.goto(BASE + "/?new=1")  # a brand-new person
    page.get_by_text("English", exact=True).click()
    page.get_by_test_id("intro-go").click()  # skip "What do you shop for?"
    header = page.get_by_test_id("savings-header")
    header.wait_for()
    assert "₹0" in header.inner_text() and "Saved so far" in header.inner_text()
    tall = header.bounding_box()["height"]
    page.mouse.move(195, 500)
    page.mouse.wheel(0, 600)
    page.wait_for_timeout(400)
    short = header.bounding_box()["height"]
    assert short < tall * 0.6, (tall, short)
    assert header.is_visible(), "savings header scrolled away"
    header.click()                                                    # tap: My requests
    page.get_by_text(re.compile("^Verify email")).wait_for()
    page.get_by_text("New request", exact=True).click()
    page.get_by_text("What do you want to buy?").wait_for()
    # Tabs stay mounted, so count the headers in view: the feed's and this page's.
    assert page.locator('[data-testid="savings-header"] >> visible=true').count() >= 2, "no savings on New request"


def test_post_button_on_top_of_feed(page):
    """Feed: a 'Post a request' button in the savings header, still there after scrolling (19 Nov)."""
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.mouse.move(195, 500)
    page.mouse.wheel(0, 800)
    page.wait_for_timeout(400)
    btn = page.get_by_test_id("post-button")
    assert btn.is_visible(), "post button scrolled away"
    assert btn.inner_text().strip() == "Post to Save ₹", btn.inner_text()
    btn.click()
    page.get_by_text("What do you want to buy?").wait_for()
    assert page.locator('[data-testid="post-button"] >> visible=true').count() <= 1, "post button also on New request"



def test_did_you_buy_it(page):
    """Voting closed on your arzi: the feed asks once. "Didn't buy" adds the price to your savings (20 Nov)."""
    open_app(page, "English")
    card = page.get_by_test_id("decide-card")
    card.wait_for()
    text = card.inner_text()
    assert "Voting closed on Bluetooth party speaker" in text and "64% said Skip it" in text, text
    header = page.get_by_test_id("savings-header")
    assert "₹16,995" in header.inner_text()
    card.get_by_text("Didn't buy", exact=True).click()
    card.wait_for(state="detached")
    page.wait_for_function("() => document.querySelector('[data-testid=savings-header]').innerText.includes('₹20,494')")
    page.reload()
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_test_id("decide-card").count() == 0, "asked again after answering"


def test_still_deciding_asks_only_once(page):
    open_app(page, "English")
    page.get_by_test_id("decide-card").get_by_text("Still deciding", exact=True).click()
    page.get_by_test_id("decide-card").wait_for(state="detached")
    page.reload()
    page.get_by_text("Buy it", exact=True).first.wait_for()
    assert page.get_by_test_id("decide-card").count() == 0
    page.get_by_text("My requests", exact=True).click()
    page.get_by_text("What did you finally do?").first.wait_for()   # still answerable there


def test_now_post_yours_after_5_votes(page):
    page.goto(BASE + "/?new=1")  # a brand-new person who has never posted
    page.get_by_text("English", exact=True).click()
    page.get_by_test_id("intro-go").click()  # skip "What do you shop for?"
    for i in range(5):
        assert page.get_by_test_id("post-nudge").count() == 0, f"nudge before vote {i + 1}"
        page.get_by_text("Buy it", exact=True).nth(i).click()
        page.get_by_text("You need it", exact=True).click()
        page.wait_for_timeout(150)
    nudge = page.get_by_test_id("post-nudge")
    nudge.wait_for()
    assert "You've helped 5 people decide." in nudge.inner_text()
    nudge.get_by_text("Not now", exact=True).click()
    nudge.wait_for(state="detached")


def test_share_result_card(page):
    """The poster's closed arzi: Share result makes a 1080x1920 image (downloaded where files can't be shared)."""
    page.add_init_script("Object.defineProperty(navigator, 'canShare', { value: undefined })")
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r7")
    # The image maker (72 KB) loads only when Share is tapped, never with the page.
    assert page.evaluate("() => [...document.scripts].some((s) => s.src.includes('html2canvas'))") is False
    page.get_by_test_id("share-result").click()
    card = page.get_by_test_id("result-card")
    card.wait_for()
    text = card.inner_text()
    assert "82%" in text and "said Skip it" in text and "Saved ₹16,995 by not buying" in text, text
    with page.expect_download() as dl:
        page.get_by_test_id("share-result-go").click()
    path = dl.value.path()
    with open(path, "rb") as f:
        head = f.read(24)
    assert head[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    w, h = int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")
    assert (w, h) == (1080, 1920), (w, h)
    page.get_by_text("Image saved", exact=False).wait_for()


def test_no_share_result_on_others_arzi(page):
    open_app(page, "English")
    page.get_by_text("Buy it", exact=True).first.wait_for()
    page.goto(BASE + "/request/r1")
    page.get_by_text("Share on WhatsApp").wait_for()
    assert page.get_by_test_id("share-result").count() == 0


def test_ok_to_feature_is_off_unless_ticked(page):
    """Posting asks for the OK to feature the arzi on our social pages: off by default, changeable later."""
    open_app(page, "English")
    page.get_by_text("New request", exact=True).first.click()
    box = page.get_by_test_id("feature-ok")
    assert box.get_attribute("aria-checked") == "false"
    box.click()
    assert box.get_attribute("aria-checked") == "true"
    page.get_by_placeholder("e.g. Noise-cancelling headphones").fill("Feature test headphones")
    page.get_by_placeholder("e.g. 8999").fill("3499")
    page.get_by_placeholder("Need or want? What happened to the old one?").fill("Mine broke last week, need for calls")
    page.get_by_text("Send request", exact=True).click()
    page.get_by_placeholder("you@email.com").fill("tester@example.com")
    page.get_by_text("Send code", exact=True).click()
    page.get_by_placeholder("Code").fill("123456")
    page.get_by_text("Verify", exact=True).click()
    page.get_by_text("Feature test headphones").first.wait_for()
    own = page.get_by_test_id("feature-own")
    assert own.get_attribute("aria-checked") == "true"
    own.click()  # the poster can take the OK back
    assert own.get_attribute("aria-checked") == "false"


def test_ok_to_feature_only_on_your_own_arzi(page):
    open_app(page, "English")
    page.goto(BASE + "/request/r1")
    page.get_by_text("Share on WhatsApp", exact=True).wait_for()
    assert page.get_by_test_id("feature-own").count() == 0
