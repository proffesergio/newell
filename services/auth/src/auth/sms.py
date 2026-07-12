import re
from typing import Protocol

from newell_common.logging import get_logger

logger = get_logger(__name__)

_CODE_RE = re.compile(r"\d{6}")


class SmsProvider(Protocol):
    def send(self, phone: str, message: str) -> None: ...


class MockSmsProvider:
    """Default provider for real deployments: logs instead of sending an SMS."""

    def send(self, phone: str, message: str) -> None:
        logger.info(message)


class CapturingSmsProvider:
    """Test double: captures sent messages instead of sending/logging them."""

    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    def send(self, phone: str, message: str) -> None:
        self.messages.append((phone, message))

    def last_code(self) -> str:
        if not self.messages:
            raise ValueError("no messages captured")
        _, message = self.messages[-1]
        match = _CODE_RE.search(message)
        if not match:
            raise ValueError(f"no 6-digit code found in message: {message!r}")
        return match.group(0)
