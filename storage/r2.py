import asyncio

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from api.config import settings
from storage.base import StorageAdapter, StorageError


class R2Storage(StorageAdapter):
    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
            config=Config(signature_version="s3v4"),
        )
        self._bucket = settings.r2_bucket

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        def _upload() -> None:
            try:
                self._client.put_object(
                    Bucket=self._bucket,
                    Key=key,
                    Body=data,
                    ContentType=content_type,
                )
            except ClientError as exc:
                raise StorageError(f"upload failed for key={key!r}: {exc}") from exc

        await asyncio.to_thread(_upload)

    async def download(self, key: str) -> bytes:
        def _download() -> bytes:
            try:
                response = self._client.get_object(Bucket=self._bucket, Key=key)
                return response["Body"].read()
            except ClientError as exc:
                raise StorageError(f"download failed for key={key!r}: {exc}") from exc

        return await asyncio.to_thread(_download)

    async def delete(self, key: str) -> None:
        def _delete() -> None:
            try:
                self._client.delete_object(Bucket=self._bucket, Key=key)
            except ClientError as exc:
                raise StorageError(f"delete failed for key={key!r}: {exc}") from exc

        await asyncio.to_thread(_delete)

    def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as exc:
            raise StorageError(f"presigned_url failed for key={key!r}: {exc}") from exc
