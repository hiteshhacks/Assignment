
from functools import lru_cache

from neo4j import GraphDatabase

from app.core.config import get_settings


@lru_cache
def get_neo4j_driver():
    settings = get_settings()

    return GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(
            settings.NEO4J_USERNAME,
            settings.NEO4J_PASSWORD,
        ),
    )


def verify_neo4j_connection() -> bool:
    driver = get_neo4j_driver()

    driver.verify_connectivity()
    return True


def initialize_graph_schema() -> None:
    driver = get_neo4j_driver()

    constraints = [
        """
        CREATE CONSTRAINT subject_id_unique IF NOT EXISTS
        FOR (s:Subject)
        REQUIRE s.id IS UNIQUE
        """,
        """
        CREATE CONSTRAINT faculty_id_unique IF NOT EXISTS
        FOR (f:Faculty)
        REQUIRE f.id IS UNIQUE
        """,
        """
        CREATE CONSTRAINT elective_id_unique IF NOT EXISTS
        FOR (e:Elective)
        REQUIRE e.id IS UNIQUE
        """,
        """
        CREATE CONSTRAINT notice_id_unique IF NOT EXISTS
        FOR (n:Notice)
        REQUIRE n.id IS UNIQUE
        """,
    ]

    with driver.session() as session:
        for constraint in constraints:
            session.run(constraint).consume()
