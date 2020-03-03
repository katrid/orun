from orun.views.generic.base import RedirectView, TemplateView, View
from orun.views.generic.dates import (
    ArchiveIndexView, DateDetailView, DayArchiveView, MonthArchiveView,
    TodayArchiveView, WeekArchiveView, YearArchiveView,
)
from orun.views.generic.detail import DetailView
from orun.views.generic.edit import (
    CreateView, DeleteView, FormView, UpdateView,
)
from orun.views.generic.list import ListView

__all__ = [
    'View', 'TemplateView', 'RedirectView', 'ArchiveIndexView',
    'YearArchiveView', 'MonthArchiveView', 'WeekArchiveView', 'DayArchiveView',
    'TodayArchiveView', 'DateDetailView', 'DetailView', 'FormView',
    'CreateView', 'UpdateView', 'DeleteView', 'ListView', 'GenericViewError',
]


class GenericViewError(Exception):
    """A problem in a generic view."""
    pass
