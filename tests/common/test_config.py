# tests/common/test_config.py
from newell_common.config import Settings, get_settings


def test_settings_defaults():
    s = Settings()
    assert s.env == "local"
    assert s.service_name == "newell"
    assert s.log_level == "INFO"


def test_settings_reads_env_prefix(monkeypatch):
    monkeypatch.setenv("NEWELL_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("NEWELL_SERVICE_NAME", "gateway")
    s = Settings()
    assert s.log_level == "DEBUG"
    assert s.service_name == "gateway"


def test_get_settings_is_cached():
    assert get_settings() is get_settings()
