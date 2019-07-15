from .registry import registry


def get_dependencies(addon, registry):
    r = []
    if isinstance(addon, str):
        addon = registry.app_configs[addon]
    deps = addon.dependencies
    if deps:
        for dep in addon.dependencies:
            r += get_dependencies(dep,registry)
        return r + list(addon.dependencies)
    return []


def adjust_dependencies(addons, registry=registry):
    # adjust module dependency priority
    lst = list(addons)
    for entry in lst:
        deps = get_dependencies(entry, registry=registry)
        if deps:
            addons.remove(entry)
            i = 0
            for dep in deps:
                if not dep in addons:
                    addons.append(dep)
                    i = len(addons) - 1
                    continue
                i = max(i, addons.index(dep))
            if i == 0:
                addons.append(entry)
            else:
                addons.insert(i + 1, entry)
    return addons
