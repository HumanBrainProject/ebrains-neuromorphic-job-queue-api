import json
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render_to_response
from uuid import UUID
from django.contrib.auth.decorators import login_required
from django.conf import settings
import requests
from hbp_app_python_auth.auth import get_access_token, get_token_type, get_auth_header
from quotas.views import is_admin

@login_required(login_url='/login/hbp/')
def show(request):
    context = UUID(request.GET.get('ctx'))
    return render_to_response('show.html', {'context': context})


@login_required(login_url='/login/hbp/')
def edit(request):
    if not _is_collaborator(request):
        return HttpResponseForbidden()

    context = UUID(request.GET.get('ctx'))
    return render_to_response('edit.html', {'context': context})


@login_required(login_url='/login/hbp/')
def coordinator_app(request):
    #context = UUID(request.GET.get('ctx'))
    if not is_admin(request):
        return HttpResponseForbidden("Only platform administrators can access this app.")
    return render_to_response('coordinator_app.html', {})


def test(request):
    return render_to_response('test.html', {})


@login_required(login_url='/login/hbp/')
def config(request):
    '''Render the config file'''

    res = requests.get(settings.HBP_ENV_URL)
    config = res.json()

    # Use this app client ID
    config['auth']['clientId'] = settings.SOCIAL_AUTH_HBP_KEY

    # Add user token informations
    request.user.social_auth.get().extra_data
    config['auth']['token'] = {
        'access_token': get_access_token(request.user.social_auth.get()),
        'token_type': get_token_type(request.user.social_auth.get()),
        'expires_in': request.session.get_expiry_age(),
    }
    config['build'] = settings.BUILD_INFO

    return HttpResponse(json.dumps(config), content_type='application/json')


def _is_collaborator(request):
    '''check access depending on context'''

    svc_url = settings.HBP_COLLAB_SERVICE_URL

    context = request.GET.get('ctx')
    if not context:
        return False
    url = '%scollab/context/%s/' % (svc_url, context)
    headers = {'Authorization': get_auth_header(request.user.social_auth.get())}
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        return False
    collab_id = res.json()['collab']['id']
    url = '%scollab/%s/permissions/' % (svc_url, collab_id)
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        return False
    return res.json().get('UPDATE', False)
