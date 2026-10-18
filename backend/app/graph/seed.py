
from app.graph.schema import (
    get_neo4j_driver,
    initialize_graph_schema,
)


def seed_campus_graph() -> None:
    initialize_graph_schema()
    driver = get_neo4j_driver()

    subjects = [
        {
            "id": "SUB-DSA",
            "name": "Data Structures and Algorithms",
            "department": "Computer Science",
        },
        {
            "id": "SUB-ML",
            "name": "Machine Learning",
            "department": "Artificial Intelligence",
        },
        {
            "id": "SUB-PY",
            "name": "Python Programming",
            "department": "Computer Science",
        },
    ]

    faculty = [
        {
            "id": "FAC-001",
            "name": "Dr. Asha Sharma",
            "department": "Artificial Intelligence",
        },
        {
            "id": "FAC-002",
            "name": "Prof. Rahul Deshmukh",
            "department": "Computer Science",
        },
    ]

    electives = [
        {
            "id": "ELEC-AI",
            "name": "Applied Artificial Intelligence",
            "description": (
                "An illustrative elective covering practical AI applications."
            ),
        },
        {
            "id": "ELEC-DATA",
            "name": "Data Science Foundations",
            "description": (
                "An illustrative elective covering data analysis and modeling."
            ),
        },
    ]

    with driver.session() as session:
        session.run(
            """
            UNWIND $subjects AS item
            MERGE (s:Subject {id: item.id})
            SET s.name = item.name,
                s.department = item.department
            """,
            subjects=subjects,
        ).consume()

        session.run(
            """
            UNWIND $faculty AS item
            MERGE (f:Faculty {id: item.id})
            SET f.name = item.name,
                f.department = item.department
            """,
            faculty=faculty,
        ).consume()

        session.run(
            """
            UNWIND $electives AS item
            MERGE (e:Elective {id: item.id})
            SET e.name = item.name,
                e.description = item.description
            """,
            electives=electives,
        ).consume()

        session.run(
            """
            MATCH (dsa:Subject {id: 'SUB-DSA'})
            MATCH (ml:Subject {id: 'SUB-ML'})
            MATCH (python:Subject {id: 'SUB-PY'})
            MATCH (asha:Faculty {id: 'FAC-001'})
            MATCH (rahul:Faculty {id: 'FAC-002'})
            MATCH (ai:Elective {id: 'ELEC-AI'})
            MATCH (data:Elective {id: 'ELEC-DATA'})

            MERGE (dsa)-[:PREREQUISITE_FOR]->(ml)
            MERGE (python)-[:PREREQUISITE_FOR]->(ml)

            MERGE (asha)-[:TEACHES]->(ml)
            MERGE (rahul)-[:TEACHES]->(dsa)

            MERGE (ai)-[:RECOMMENDED_AFTER]->(ml)
            MERGE (data)-[:RECOMMENDED_AFTER]->(dsa)
            """
        ).consume()

    print("CampusMind sample graph seeded successfully.")


if __name__ == "__main__":
    seed_campus_graph()
