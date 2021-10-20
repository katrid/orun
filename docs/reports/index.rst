===============
Writing reports
===============

Reports can be used to display information to user with or without input parameters.
It also helps the test and development process once the developer can run the target code without
interaction.


Run your code
=============

To execute your code, orun offers the quick run by calling the ``runfile`` command:

.. console::

    $ python manage.py runfile reports/myreport.py

#. The runfile command handler will find the first "executable" class in ``myreport.py`` and invoke it.


.. code-block:: python
    :caption: myapp/reports.py

    from orun.reports import Report


    # printing vsql result directly to output
    class Report1(Report):
        def execute(self, params):
            self.print(self.execsql('''select id, name from res.partner'''))

    ...
    # browse vsql data directly
    class Report1(Report):
        def execute(self, params):
            self.browse(self.execsql('''select id, name from res.partner'''))

    ...


Database queries using OpenQuery
--------------------------------

.. code-block:: python
    class MyReport(Report):
        def execute(self, params):
            # select statement using OpenQuery SQL dialect
            for rec in self.execsql('''select name from res.partner'''):
                ...
            ...
            # the same result could be achieved by the following statements
            records = [rec for rec in self.execsql('''select name from res.partner''')]
            self.print(records)
            self.write(f'{len(records)!r} record(s) found.')


Representing database data with dataclasses
-------------------------------------------

.. code-block:: python
    :caption: myapp/reports.py
    from orun.reports import *


    # printing list of dataclass instances
    class MyReport(Report):
        def execute(self, params):
            @dataclass
            class MemoryData:
                id: int
                name: str

            records = [
                MemoryData(1, 'Record 1'),
                MemoryData(2, 'Record 2'),
            ]
            self.print(records)

            ...

            records: list[MemoryData] = []
            records.append(MemoryData(1, 'Record 1'))
            records.append(MemoryData(2, 'Record 2'))
            self.print(records)

    ...
    # Returning query result into python variable using OpenQuery
    class MyReport(Report):
        class Params:
            name: str

        def execute(self, params: Params):
            @dataclass
            class Partners:
                name: str

            records: list[Partners] = []
            # fill the query result into records variable
            self.execsql('''select name from res.partner into :records''')


Input parameters
----------------

Input parameters are useful when you need to ask values before begin the process execution.

.. code-block:: python
    :caption: myapp/reports.py
    from orun.reports import *


    class Report1(Report):
        class Params:
            id: int
            # or...
            id: int = models.IntegerField(label='Input ID')

        def execute(self, params):
            self.write(f'User input id: {params.id!r}')
