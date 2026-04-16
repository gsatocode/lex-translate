import pytest
from botocore.exceptions import ClientError
from unittest.mock import patch, MagicMock

from storage.base import StorageError
from storage.r2 import R2Storage


@pytest.fixture
def r2_storage():
    with patch("storage.r2.boto3.client") as mock_boto:
        mock_client = MagicMock()
        mock_boto.return_value = mock_client
        storage = R2Storage()
        yield storage, mock_client


@pytest.mark.asyncio
async def test_upload_calls_put_object(r2_storage):
    storage, mock_client = r2_storage
    await storage.upload("org/doc/file.pdf", b"data", "application/pdf")
    mock_client.put_object.assert_called_once_with(
        Bucket=storage._bucket,
        Key="org/doc/file.pdf",
        Body=b"data",
        ContentType="application/pdf",
    )


@pytest.mark.asyncio
async def test_download_returns_body(r2_storage):
    storage, mock_client = r2_storage
    mock_client.get_object.return_value = {"Body": MagicMock(read=lambda: b"file content")}
    result = await storage.download("org/doc/file.pdf")
    assert result == b"file content"


@pytest.mark.asyncio
async def test_delete_calls_delete_object(r2_storage):
    storage, mock_client = r2_storage
    await storage.delete("org/doc/file.pdf")
    mock_client.delete_object.assert_called_once_with(
        Bucket=storage._bucket, Key="org/doc/file.pdf"
    )


def test_presigned_url_returns_https_string(r2_storage):
    storage, mock_client = r2_storage
    mock_client.generate_presigned_url.return_value = "https://r2.example.com/key?sig=abc"
    url = storage.presigned_url("org/doc/file.pdf")
    assert url.startswith("https://")
    mock_client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": storage._bucket, "Key": "org/doc/file.pdf"},
        ExpiresIn=3600,
    )


@pytest.mark.asyncio
async def test_download_raises_storage_error_on_client_error(r2_storage):
    storage, mock_client = r2_storage
    mock_client.get_object.side_effect = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "GetObject"
    )
    with pytest.raises(StorageError, match="download failed"):
        await storage.download("org/doc/missing.pdf")


@pytest.mark.asyncio
async def test_upload_raises_storage_error_on_client_error(r2_storage):
    storage, mock_client = r2_storage
    mock_client.put_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Forbidden"}}, "PutObject"
    )
    with pytest.raises(StorageError, match="upload failed"):
        await storage.upload("org/doc/file.pdf", b"data", "application/pdf")
