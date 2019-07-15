
class ForeignObjectRel:
    def __init__(self, field, to, limit_choices_to=None):
        self.limit_choices_to = limit_choices_to
        self.field = field
        self.model = to

    def set_field_name(self):
        pass


class ManyToOneRel(ForeignObjectRel):
    remote_field = None

    def __init__(self, field, to, field_name, limit_choices_to=None):
        super().__init__(
            field, to,
            limit_choices_to=limit_choices_to,
        )

        self.field_name = field_name

    def set_field_name(self):
        self.field_name = self.field_name or self.model._meta.pk.name
        self.remote_field = self.model._meta.fields[self.field_name]
        self.field.db_type = self.remote_field.db_type


class ManyToManyRel(ForeignObjectRel):
    def __init__(self, field, to, limit_choices_to=None, through=None, through_fields=None):
        super().__init__(
            field, to,
            limit_choices_to=limit_choices_to,
        )
        self.from_field = None
        self.to_field = None
        self.through = through
        self.through_fields = through_fields

    def set_field_names(self):
        if not self.through_fields:
            self.from_field = get_first_rel_field(self.through, self.field.model)
            self.to_field = get_first_rel_field(self.through, self.model)



class OneToManyRel(ManyToOneRel):
    def set_field_name(self):
        if self.field_name is None:
            self.remote_field = get_first_rel_field(self.model, self.field.model)
            self.field_name = self.remote_field.name
        else:
            self.remote_field = self.model._meta.fields[self.field_name]


def get_first_rel_field(model, rel_model):
    for f in model._meta.fields:
        if f.many_to_one and f.rel.model._meta.name == rel_model._meta.name:
            return f
