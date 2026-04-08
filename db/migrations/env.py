import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from api.models.base import Base
import api.models  # noqa: F401 — registers all models with Base.metadata

config = context.config

# Override URL from DATABASE_URL env var (replaces asyncpg with psycopg2 for Alembic)
db_url = os.environ.get("DATABASE_URL", "")
if db_url:
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    if "psycopg2" not in sync_url:
        raise ValueError(
            f"DATABASE_URL could not be converted to a sync driver for Alembic. "
            f"Expected 'postgresql+asyncpg://' prefix, got: {db_url}"
        )
    config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
