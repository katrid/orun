from orun.db import models


class Author(models.Model):
    name = models.CharField(100)
    first_name = models.CharField(100)
    last_name = models.CharField(100)
    pub_date = models.DateTimeField()

    @name.onchange
    def _name_change(self):
        print('name change', self.name)
