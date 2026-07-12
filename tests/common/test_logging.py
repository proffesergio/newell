import json
import logging

from newell_common.logging import configure_logging, get_logger


def test_logger_emits_json(capsys):
    configure_logging("INFO")
    log = get_logger("test.logger")
    log.info("hello", extra={"request_id": "abc123"})
    out = capsys.readouterr().out.strip().splitlines()[-1]
    record = json.loads(out)
    assert record["level"] == "INFO"
    assert record["logger"] == "test.logger"
    assert record["message"] == "hello"
    assert record["request_id"] == "abc123"
    assert "timestamp" in record


def test_configure_logging_sets_level():
    configure_logging("DEBUG")
    assert logging.getLogger().level == logging.DEBUG
