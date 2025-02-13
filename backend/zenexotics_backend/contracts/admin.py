from django.contrib import admin
from .models import Contract, ContractTemplate

# Register your models here
admin.site.register(ContractTemplate)
admin.site.register(Contract)
