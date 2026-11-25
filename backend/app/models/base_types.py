import uuid
from sqlalchemy.types import TypeDecorator, CHAR, String, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB, ARRAY as PG_ARRAY


class GUID(TypeDecorator):
    """
    Tipo universal de UUID:
    Usa UUID nativo no PostgreSQL e CHAR(36) no SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(str(value)))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif isinstance(value, uuid.UUID):
            return value
        else:
            return uuid.UUID(str(value))


# JSONB no PostgreSQL, JSON no SQLite
JSON_TYPE = JSON().with_variant(PG_JSONB, "postgresql")

# ARRAY(String) no PostgreSQL, JSON no SQLite
ARRAY_TYPE = JSON().with_variant(PG_ARRAY(String), "postgresql")
