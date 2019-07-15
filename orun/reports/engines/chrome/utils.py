from statistics import mean


def to_list(iterable):
    for obj in iterable:
        yield obj[0]


def avg(iterable, member=None):
    vals = iterable
    if member:
        vals = list([getattr(obj, member) or 0 for obj in iterable])
    if vals:
        return mean(vals)


def total(iterable, member):
    return sum([getattr(obj, member) or 0 for obj in iterable])

