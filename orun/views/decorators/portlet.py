from typing import Optional


def callback(*args):
    pass


class Output:
    def __init__(self, element_id: str, prop: str = None):
        self.element_id = element_id
        self.prop = prop


class Input:
    pass


class State:
    pass
