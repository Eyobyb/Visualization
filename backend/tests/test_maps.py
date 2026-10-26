"""Google Maps lookup: link parsing and place records. The browser is not started here."""
import pytest

from app import maps

PLACE = (
    "https://www.google.com/maps/place/Etete+Coffee/data=!4m7!3m6!1s0x164b:0xaa40"
    "!8m2!3d8.9897283!4d38.7865123!16s%2Fg%2F11xzs5gs7d"
)


def test_search_url_quotes_the_query():
    assert maps.search_url("  coffee   shops in Bole ") == (
        "https://www.google.com/maps/search/coffee%20shops%20in%20Bole?hl=en"
    )
    with pytest.raises(ValueError):
        maps.search_url("   ")
    with pytest.raises(ValueError):
        maps.search_url("x" * 201)


def test_coords_come_from_the_place_link():
    assert maps.coords_of(PLACE) == {"lat": 8.9897283, "lng": 38.7865123}
    assert maps.coords_of("https://www.google.com/maps/search/coffee") == {"lat": None, "lng": None}


def test_only_google_maps_place_links_are_opened():
    assert maps.place_url(PLACE + "?hl=en") == PLACE + "?hl=en"
    assert maps.place_url("https://evil.example/maps/place/x!3d1!4d2") is None
    assert maps.place_url("https://www.google.com/maps/search/coffee") is None
    assert maps.place_url("file:///etc/passwd") is None


def test_place_record_prefers_the_place_page():
    card = {"name": "Etete", "rating": 4.5, "url": PLACE, "summary": "4.5 · Coffee shop · Open"}
    detail = {
        "name": "Etete Coffee",
        "category": "Coffee shop",
        "rating": 4.6,
        "hours": "Monday, Open 24 hours",
        "items": {
            "address": "\ue0c8 DH Geda Tower, Bole, Addis Ababa",
            "phone:tel:+251911000000": "\ue0b0 099 966 6677",
            "authority": "https://etete.example",
        },
    }
    row = maps.place_record(card, detail)
    assert row["name"] == "Etete Coffee"
    assert row["rating"] == 4.6
    assert row["address"] == "DH Geda Tower, Bole, Addis Ababa"
    assert row["hours"] == "Monday, Open 24 hours"
    assert row["phone"] == "099 966 6677"
    assert row["website"] == "https://etete.example"
    assert row["lat"] == 8.9897283 and row["lng"] == 38.7865123
    assert row["maps_url"].startswith("https://www.google.com/maps/place/")
    assert row["summary"].startswith("4.5")


def test_place_record_keeps_the_card_when_the_page_has_nothing():
    row = maps.place_record({"name": "Akoo", "rating": 4.1, "url": PLACE, "summary": "Open 24 hours"}, None)
    assert row["name"] == "Akoo" and row["rating"] == 4.1
    assert row["address"] is None and row["phone"] is None
    assert row["hours"] == "Open 24 hours"


def test_render_marks_the_results_untrusted():
    text = maps.render("coffee", [{"name": "Tomoca"}])
    assert text.startswith("Untrusted web content")
    assert '"name": "Tomoca"' in text and "coffee" in text
