from orun import Application

# Create an app instance
app = Application(__name__)
with app.app_context():
    app.cli()
