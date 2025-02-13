from django.contrib import admin
from .models import ProfessionalStatus

@admin.register(ProfessionalStatus)
class ProfessionalStatusAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'is_approved',
        'approval_date',
        'approved_for_dogs',
        'approved_for_cats',
        'approved_for_exotics'
    )
    list_filter = (
        'is_approved',
        'approved_for_dogs',
        'approved_for_cats',
        'approved_for_exotics'
    )
    search_fields = ('user__email', 'approval_notes')
    ordering = ('-created_at',) 