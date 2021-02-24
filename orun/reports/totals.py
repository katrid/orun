from enum import Enum
from .objects import ReportObject


class Aggregation(Enum):
    COUNT = 0
    SUM = 0
    AVG = 0


class Total(ReportObject):
    aggregation: Aggregation = Aggregation.COUNT
    expression: str = None
