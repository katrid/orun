import flask_mail


class Message(flask_mail.Message):
    def as_string(self):
        # bug fix ascii error encoding when the return is a str object
        return super().as_string().encode('utf-8')
