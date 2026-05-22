import os

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://mkw:changeme@localhost:5432/mkw_stats",
)

# psycopg3 requires postgresql+psycopg:// scheme
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
