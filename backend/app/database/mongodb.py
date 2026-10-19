
import os

from dotenv import load_dotenv

try:
    import dns.resolver
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=True)
    dns.resolver.default_resolver.nameservers = ["8.8.8.8", "1.1.1.1"] + [
        ns for ns in dns.resolver.default_resolver.nameservers if ns not in ["8.8.8.8", "1.1.1.1"]
    ]
except Exception:
    pass

from pymongo import MongoClient, ReturnDocument

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL is missing from .env")

client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=10000
)

database = client["nextask"]


def check_mongodb_connection():
    client.admin.command("ping")
    return True


def get_next_id(collection_name: str) -> int:
    counters = database["counters"]
    collection = database[collection_name]

    max_doc = collection.find_one(sort=[("id", -1)])
    current_max_id = max_doc["id"] if (max_doc and "id" in max_doc and isinstance(max_doc["id"], int)) else 0

    counters.update_one(
        {"_id": collection_name},
        {"$setOnInsert": {"sequence_value": current_max_id}},
        upsert=True
    )

    # Ensure sequence_value is never behind current_max_id
    counters.update_one(
        {"_id": collection_name, "sequence_value": {"$lt": current_max_id}},
        {"$set": {"sequence_value": current_max_id}}
    )

    counter = counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"sequence_value": 1}},
        return_document=ReturnDocument.AFTER
    )

    return counter["sequence_value"]


def serialize_doc(doc: dict | None) -> dict | None:
    """Helper to remove MongoDB's internal _id field from a document dictionary."""
    if not doc:
        return doc
    clean = dict(doc)
    clean.pop("_id", None)
    return clean


def serialize_docs(docs: list[dict]) -> list[dict]:
    """Helper to remove MongoDB's internal _id field from a list of document dictionaries."""
    return [serialize_doc(d) for d in docs if d is not None]

