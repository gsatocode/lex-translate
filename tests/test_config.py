def test_settings_load():
    from api.config import settings
    assert settings.secret_key is not None
    assert settings.database_url.startswith("postgresql")
    assert settings.redis_url.startswith("redis")
