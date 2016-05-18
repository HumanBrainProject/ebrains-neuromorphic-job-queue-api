from django.forms import ModelForm, BooleanField
from .models import Project, Quota


class ProposalForm(ModelForm):

    submitted = BooleanField(required=False)

    class Meta:
        model = Project
        fields = [
            'context', 'collab', 'owner',
            'title', 'abstract', 'description']



class AddQuotaForm(ModelForm):

    class Meta:
        model = Quota
        fields = "__all__"
