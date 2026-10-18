
import re

from app.graph.schema import get_neo4j_driver


STOP_WORDS = {
    "what", "who", "which", "where", "when", "does",
    "teach", "teaches", "teacher", "professor", "faculty",
    "about", "tell", "me", "the", "is", "are", "for",
    "and", "in", "of", "to", "my", "i", "should",
    "before", "after", "weak", "consider", "electives",
}


def retrieve_graph_context(query: str) -> list[dict]:
    terms = [
        word
        for word in re.findall(r"[a-zA-Z0-9]+", query.lower())
        if len(word) > 1 and word not in STOP_WORDS
    ]

    if not terms:
        return []

    cypher = """
    MATCH (s:Subject)
    WHERE any(
        term IN $terms
        WHERE toLower(s.name) CONTAINS term
    )

    OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(s)
    WITH s, collect(DISTINCT f.name) AS faculty

    OPTIONAL MATCH (p:Subject)-[:PREREQUISITE_FOR]->(s)
    WITH s, faculty, collect(DISTINCT p.name) AS prerequisites

    OPTIONAL MATCH (e:Elective)-[:RECOMMENDED_AFTER]->(s)
    WITH s, faculty, prerequisites,
         collect(DISTINCT e.name) AS electives

    RETURN s.name AS subject,
           s.department AS department,
           faculty,
           prerequisites,
           electives
    LIMIT 10
    """

    driver = get_neo4j_driver()

    with driver.session() as session:
        result = session.run(cypher, terms=terms)
        return [record.data() for record in result]
