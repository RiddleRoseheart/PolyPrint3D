from dataclasses import dataclass
from datetime import datetime

@dataclass
class File:
    id: str
    filename: str
    path: str
    status: str
    created_at: datetime
    updated_at: datetime