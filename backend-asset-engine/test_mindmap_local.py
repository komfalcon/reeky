import asyncio
import json
import uuid
import math
import sys
sys.path.append('c:\\Users\\DELL\\CascadeProjects\\REEKY ACADEMIC HUB\\backend-asset-engine')
from tasks import process_submission_sync, transform_mindmap_to_graph

print("Testing transform_mindmap_to_graph...")
test_tree = {
    "name": "Evolution of Spatial Computing",
    "children": [
        {"name": "Concept 1", "children": [{"name": "Detail 1"}]},
        {"name": "Concept 2"}
    ]
}
try:
    res = transform_mindmap_to_graph(test_tree)
    print(f"Success! {len(res['nodes'])} nodes generated.")
except Exception as e:
    print(f"Error: {e}")
