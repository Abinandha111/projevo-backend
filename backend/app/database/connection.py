"""
Database connection module.
Migrated from PostgreSQL/SQLAlchemy to MongoDB Atlas.
"""

from app.database.mongodb import client, database, check_mongodb_connection

# Re-export MongoDB database objects for convenience
__all__ = ["client", "database", "check_mongodb_connection"]