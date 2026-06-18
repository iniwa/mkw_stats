import enum


class SourceType(str, enum.Enum):
    ranked = "ranked"
    lounge = "lounge"


class RaceStatus(str, enum.Enum):
    draft = "draft"
    completed = "completed"
    cancelled = "cancelled"


class SessionStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PlacementBand(str, enum.Enum):
    top = "top"
    middle = "middle"
    bottom = "bottom"


class AnnotationType(str, enum.Enum):
    pin = "pin"
    icon = "icon"
    arrow = "arrow"
    text = "text"
    area = "area"


class TimeAttackCategory(str, enum.Enum):
    nita = "nita"
    item = "item"
