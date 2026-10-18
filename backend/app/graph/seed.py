
from app.graph.schema import get_neo4j_driver, initialize_graph_schema


FACULTY = [
    {
        "id": "FAC-POONAM-WANKHEDE",
        "name": "Poonam Wankhede",
        "department": "AIML",
        "subject_id": "SUB-TOC",
        "subject": "Theory of Computation",
    },
    {
        "id": "FAC-SHRADDHA-VAIDYA",
        "name": "Shraddha Vaidya",
        "department": "AIML",
        "subject_id": "SUB-FOAI",
        "subject": "Fundamentals of Artificial Intelligence",
    },
    {
        "id": "FAC-PRATIBHA-WAGALE",
        "name": "Pratibha Wagale",
        "department": "CSE",
        "subject_id": "SUB-DAA",
        "subject": "Design and Analysis of Algorithms",
    },
    {
        "id": "FAC-RENUKA-KADU",
        "name": "Renuka Kadu",
        "department": "CSE",
        "subject_id": "SUB-JAVA",
        "subject": "Java Programming",
    },
    {
        "id": "FAC-ROSHNI-RATHOD",
        "name": "Roshni Rathod",
        "department": "CSE",
        "subject_id": "SUB-CV",
        "subject": "Computer Vision",
    },
    {
        "id": "FAC-PRASHANT-GULAXE",
        "name": "Prashant Gulaxe",
        "department": "CSE",
        "subject_id": "SUB-DBMS",
        "subject": "Database Management Systems",
    },
    {
        "id": "FAC-MILIND-TOTE",
        "name": "Milind Tote",
        "department": "AIML",
        "subject_id": "SUB-DMPT",
        "subject": "Discrete Mathematics and Probability Theory",
    },
]

HODS = [
    {
        "id": "FAC-LALIT-DAMAHE",
        "name": "Lalit Damahe",
        "departments": ["CSE", "AIML"],
    }
]


def seed_graph() -> None:
    initialize_graph_schema()
    driver = get_neo4j_driver()

    with driver.session() as session:
        # Create department nodes.
        for department in ("CSE", "AIML"):
            session.run(
                """
                MERGE (d:Department {id: $id})
                SET d.name = $name
                """,
                id=f"DEPT-{department}",
                name=department,
            ).consume()

        # Create faculty, subject, and TEACHES relationships.
        for record in FACULTY:
            session.run(
                """
                MERGE (f:Faculty {id: $faculty_id})
                SET f.name = $faculty_name,
                    f.department = $department

                MERGE (d:Department {id: $department_id})
                SET d.name = $department

                MERGE (f)-[:BELONGS_TO]->(d)

                MERGE (s:Subject {id: $subject_id})
                SET s.name = $subject_name,
                    s.department = $department

                MERGE (f)-[:TEACHES]->(s)
                """,
                faculty_id=record["id"],
                faculty_name=record["name"],
                department=record["department"],
                department_id=f"DEPT-{record['department']}",
                subject_id=record["subject_id"],
                subject_name=record["subject"],
            ).consume()

        # Create HOD relationships for both departments.
        for hod in HODS:
            for department in hod["departments"]:
                session.run(
                    """
                    MERGE (f:Faculty {id: $faculty_id})
                    SET f.name = $faculty_name

                    MERGE (d:Department {id: $department_id})
                    SET d.name = $department

                    MERGE (f)-[:HEADS]->(d)
                    """,
                    faculty_id=hod["id"],
                    faculty_name=hod["name"],
                    department_id=f"DEPT-{department}",
                    department=department,
                ).consume()

    print("YCCE faculty and subject graph seeded successfully.")


if __name__ == "__main__":
    seed_graph()
