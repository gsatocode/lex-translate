"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-07
"""
import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("file_type", sa.String(10), nullable=False),
        sa.Column("storage_key", sa.Text),
        sa.Column("source_lang", sa.String(10)),
        sa.Column("page_count", sa.Integer),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_org_id", "documents", ["org_id"])
    op.create_index("ix_documents_uploaded_by", "documents", ["uploaded_by"])
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False, unique=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("current_stage", sa.String(50)),
        sa.Column("progress", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_jobs_org_id", "jobs", ["org_id"])
    op.create_index("ix_jobs_document_id", "jobs", ["document_id"])
    op.create_table(
        "translation_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("original_text", sa.Text, nullable=False),
        sa.Column("translated_text", sa.Text, nullable=False),
        sa.Column("source_lang", sa.String(10)),
        sa.Column("tokens_used", sa.Integer),
        sa.Column("llm_provider", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_translation_chunks_job_id", "translation_chunks", ["job_id"])
    op.create_table(
        "output_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("output_format", sa.String(10), nullable=False),
        sa.Column("storage_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_output_documents_job_id", "output_documents", ["job_id"])
    op.create_table(
        "glossary_terms",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("source_term", sa.Text, nullable=False),
        sa.Column("target_term", sa.Text, nullable=False),
        sa.Column("domain", sa.String(50), nullable=False, server_default="legal"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("org_id", "source_term", name="uq_glossary_terms_org_source"),
    )
    op.create_index("ix_glossary_terms_org_id", "glossary_terms", ["org_id"])
    op.create_table(
        "validation_reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("passed", sa.Boolean, nullable=False),
        # Text (not JSONB) — matches model intentionally for cross-DB compat (SQLite in tests)
        sa.Column("issues", sa.Text, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_validation_reports_job_id", "validation_reports", ["job_id"])


def downgrade() -> None:
    op.drop_table("validation_reports")
    op.drop_table("glossary_terms")
    op.drop_table("output_documents")
    op.drop_table("translation_chunks")
    op.drop_table("jobs")
    op.drop_table("documents")
    op.drop_table("users")
    op.drop_table("organizations")
