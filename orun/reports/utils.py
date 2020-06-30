from statistics import mean


def to_list(iterable):
    for obj in iterable:
        yield obj[0]


def avg(iterable, member=None):
    vals = iterable
    if member:
        vals = list([getattr(obj, member) or 0 for obj in iterable])
    if vals:
        return mean([val or 0 for val in vals])


def total(iterable, member):
    return sum([obj[member] or 0 if isinstance(obj, dict) else getattr(obj, member) or 0 for obj in iterable])


def COUNT(band):
    return band.counter


def SUM(iterable, band):
    return sum(iterable)


def AVG(iterable, band):
    return mean(iterable)
