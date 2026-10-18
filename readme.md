backend /
    uvicorn app.main:app --reload
    docker compose up -d 
frontend /
# From f:\CampusMind in your terminal
python -m http.server 3000 --directory frontend

neo4j /
MATCH (n)
OPTIONAL MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 200;
