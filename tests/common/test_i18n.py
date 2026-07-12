from newell_common.i18n import translate


def test_translate_en():
    assert translate("otp.sent", "en") == "Verification code sent."


def test_translate_bn():
    assert translate("otp.sent", "bn") == "যাচাই কোড পাঠানো হয়েছে।"


def test_unknown_locale_falls_back_to_en():
    assert translate("otp.sent", "xx") == "Verification code sent."


def test_unknown_key_returns_key():
    assert translate("does.not.exist", "en") == "does.not.exist"
