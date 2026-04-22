"""Extensibility contributions for the addons."""
from typing import TypedDict, Optional, Any, Literal, Self


class ConfigurationProperty(TypedDict):
    type: Literal['string', 'number', 'boolean', 'array', 'object', 'null']
    description: Optional[str]
    default: Optional[Any]
    pattern: Optional[str]
    min_length: Optional[int]
    max_length: Optional[int]
    minimum: Optional[int]
    maximum: Optional[int]
    multiple_of: Optional[int]
    format: Optional[str]
    enum: Optional[list[str] | dict[str, str]]
    items: Optional[list[Any]]
    properties: dict[str, Self]


class Configuration(TypedDict):
    title: str
    description: str
    properties: dict[str, ConfigurationProperty]


class Contributes(TypedDict):
    configuration: Optional[Configuration]
