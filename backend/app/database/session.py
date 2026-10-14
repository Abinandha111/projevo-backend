"""
Database session module.
Migrated from PostgreSQL/SQLAlchemy to MongoDB Atlas.
"""

from app.database.mongodb import database


def get_db():
    """Compatibility provider returning the MongoDB database instance."""
    return database