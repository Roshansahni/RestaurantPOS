from alembic import context
from sqlalchemy import create_engine
from app.config import settings
from app.db import Base
from app import models  # noqa: F401

target = Base.metadata
def run():
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()
run()
