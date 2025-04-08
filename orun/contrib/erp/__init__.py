from orun.contrib.auth import current_user_id


def current_company_id():
    from .models import User
    if u := User.objects.only('user_company_id').filter(pk=current_user_id()).first():
        return u.user_company_id


def current_company():
    from .models import Company
    if company_id := current_company_id():
        return Company.objects.only('pk', 'name', 'documento').filter(pk=company_id).first()
