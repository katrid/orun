from orun.apps import Application


app = Application('orun-admin')
with app.app_context():
    app.cli()
