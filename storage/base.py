from abc import ABC, abstractmethod


class StorageError(Exception):
    """Raised when a storage operation fails."""


class StorageAdapter(ABC):
    @abstractmethod
    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Upload bytes to the given key."""

    @abstractmethod
    async def download(self, key: str) -> bytes:
        """Download and return bytes at key."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete the object at key."""

    @abstractmethod
    def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Return a pre-signed URL valid for expires_in seconds."""
