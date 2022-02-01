import logging
from django.shortcuts import render
from django.template.context import RequestContext
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json
import requests
from hbp_app_python_auth.auth import get_access_token, get_token_type
import ebrains_drive
from ebrains_drive.client import DriveApiClient
from django.conf import settings

import os.path
import tempfile
import shutil
import mimetypes
from simqueue.models import Job
try:
    from urlparse import urlparse
    from urllib import urlretrieve
except ImportError:  # Py3
    from urllib.parse import urlparse
    from urllib.request import urlretrieve
import errno

logger = logging.getLogger("simqueue")


@login_required(login_url='/login/hbp/')
def home(request):
    # from the request context, load user
    context = {'request': request, 'user': request.user}
    request.access_token = ''
    return render(request, 'home.html', context)


@login_required(login_url='/login/hbp/')
def config(request):
    '''Render the config file'''

    res = requests.get(settings.HBP_ENV_URL)
    config = res.json()

    # Use this app client ID
    config['auth']['clientId'] = settings.SOCIAL_AUTH_HBP_KEY

    # Add user token information
    logger.debug("user = {}".format(request.user))
    config['auth']['token'] = {
        'access_token': get_access_token(request.user.social_auth.get()),
        'token_type': get_token_type(request.user.social_auth.get()),
        'expires_in': request.session.get_expiry_age(),
    }
    config['build'] = settings.BUILD_INFO

    return HttpResponse(json.dumps(config), content_type='application/json')


def mkdir_p(path):
    # not needed in Python >= 3.2, use os.makedirs(path, exist_ok=True)
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

def convert_bytes(size_in_bytes,unit):
    size_units = ['bytes', 'KB', 'MB', 'GB', 'TB']
    return size_in_bytes/(1024**size_units.index(unit))

def get_file_size(file_path, unit):
    if os.path.isfile(file_path):
        file_info = os.stat(file_path)
        return convert_bytes(file_info.st_size, unit)

# @login_required(login_url='/login/hbp/')
def copy_datafiles_to_storage(request, target, job_id):
    # get list of output data files from job_id
    job = Job.objects.get(pk=job_id)
    datalist = job.output_data.all()
    # for now, we copy all files. In future, could allow selection of subset

    # todo: check that the files haven't already been copied to the collab

    if datalist:
        # download to local storage
        server_paths = [urlparse(item.url)[2] for item in datalist]
        if len(server_paths) > 1:
            common_prefix = os.path.commonprefix(server_paths)
            assert common_prefix[-1] == "/"
        else:
            common_prefix = os.path.dirname(server_paths[0])
        relative_paths = [os.path.relpath(p, common_prefix) for p in server_paths]

        local_dir = tempfile.mkdtemp()
        for relative_path, dataitem in zip(relative_paths, datalist):
            url = dataitem.url
            (scheme, netloc, path, params, query, fragment) = urlparse(url)
            if not scheme:
                url = "file://" + url
            local_path = os.path.join(local_dir, relative_path)
            dir = os.path.dirname(local_path)
            mkdir_p(dir)
            local_path = os.path.join(dir, relative_path)
            urlretrieve(url, local_path)
        # upload files
        if target == "collab":
            target_paths = copy_datafiles_to_collab_storage(request, job, local_dir, relative_paths)
        elif target == "drive":
            target_paths = copy_datafiles_to_collab_drive(request, job, local_dir, relative_paths)
        else:
            target_paths = copy_datafiles_with_unicore(request, target, job, local_dir, relative_paths)

        # todo: change path of data files in job record to point to collab storage
        # todo: update provenance record to reflect the copy
        # todo: change the ownership metadata to reflect who launched the job rather than who initiated the copy

        # clean up local dir  # should put most of the function body in a try..except, to ensure we always clean up
        shutil.rmtree(local_dir)
    else:
        target_paths = []

    return HttpResponse(json.dumps(target_paths), content_type='application/json')

def copy_datafiles_to_collab_storage(request, job, local_dir, relative_paths):

    # upload local files to collab storage
    #from bbp_client.oidc.client import BBPOIDCClient
    #from bbp_client.document_service.client import Client as DocClient
    #import bbp_services.client as bsc
    import hbp_service_client.document_service.client as doc_service_client
    #services = bsc.get_services()
    access_token = get_access_token(request.user.social_auth.get())
    #oidc_client = BBPOIDCClient.bearer_auth(services['oidc_service']['prod']['url'], access_token)
    #doc_client = DocClient(services['document_service']['prod']['url'], oidc_client)
    #dsc = doc_service_client.Client.__init__()
    dsc = doc_service_client.Client.new(access_token)

    #project = doc_client.get_project_by_collab_id(job.collab_id)
    project_dict = dsc.list_projects(None, None, None, job.collab_id)
    project = project_dict['results']
    #root = doc_client.get_path_by_id(project["_uuid"])
    root = dsc.get_entity_path(project[0]['uuid'])
    collab_folder = root + "/job_{}".format(job.pk)
    collab_folder_2 = "job_{}".format(job.pk)
    #folder_id = doc_client.mkdir(collab_folder)
    folder = dsc.create_folder(collab_folder_2, str(project[0]['uuid']))
    folder_id = folder['uuid']

    collab_paths = []
    for relative_path in relative_paths:
        collab_path = os.path.join(collab_folder, relative_path)
        cps = collab_path.split('/')
        collab_path_2 = cps[3]
        if os.path.dirname(relative_path):  # if there are subdirectories...
            #doc_client.makedirs(os.path.dirname(collab_path))
            collab_path_id = dsc.create_folder(collab_path_2, folder_id)
        local_path = os.path.join(local_dir, relative_path)

        #id = doc_client.upload_file(local_path, collab_path)
        #file = dsc.create_file("file_to_upload", "plain/text", collab_path_id['uuid'])
        file = dsc.create_file(relative_path, "plain/text", folder_id)
        with open(local_path, 'rb') as fp:
            file_contents = fp.read()

        id = dsc.upload_file_content(file['uuid'], None, None, file_contents)
        #logging.warning("successful upload content")

        collab_paths.append(collab_path)
        content_type = mimetypes.guess_type(local_path)[0]
        if content_type:
            #doc_client.set_standard_attr(collab_path, {'_contentType': content_type})
            os.path.normpath(os.path.join('/', str(collab_path)))
    return collab_paths

def copy_datafiles_to_collab_drive(request, job, local_dir, relative_paths):

    size_limit = 1.

    access_token = request.META.get('HTTP_AUTHORIZATION').replace("Bearer ", "")
    ebrains_drive_client = ebrains_drive.connect(token=access_token)

    # print(list)
    collab_name = job.collab_id
    target_repository = ebrains_drive_client.repos.get_repo_by_url(collab_name)
    seafdir = target_repository.get_dir('/')
    collab_folder = "/job_{}".format(job.pk)
    print("Check for existence of ", collab_folder)
    try:
        dir = target_repository.get_dir(collab_folder)
        print("directory",dir,"exists in the target repository")
    except:
        print("The path",collab_folder,"does not yet exist in the target repository")
        dir = seafdir.mkdir(collab_folder)
    
    collab_paths = []
    for relative_path in relative_paths:
        collab_path = os.path.join(collab_folder, relative_path)
        splitted_collab_path = collab_path.split('/')
        if os.path.dirname(relative_path):  # if there are subdirectories...
            subdirectory = collab_folder
            for d in range(2, len(splitted_collab_path)-1):
                subdirectory += '/'+splitted_collab_path[d]
                print("Check for existence of", subdirectory)
                try:
                    subdir = target_repository.get_dir(subdirectory)
                    print("directory",subdir,"exists in the target repository")
                except:
                    print("The path",subdirectory,"does not yet exist in the target repository")
                    subdir = seafdir.mkdir(subdirectory)
                    print("Creation of the", subdir, ' directory')
        local_path = os.path.join(local_dir, relative_path)
        print("File ",relative_path,"may need to be copied")
        try:
            print('we are in try, and the collabpath is', collab_path)
            target_repository.get_file(collab_path)
            print("A file",relative_path," exists already in the target repositiory")
        except:
            print("No file ",relative_path,"yet in the target directoy")
            print("Copy the file to destination directory",splitted_collab_path[1])
            if get_file_size(local_path, 'GB') < size_limit:
                dir = target_repository.get_dir(subdirectory)
                dir.upload_local_file(local_path)    #not the right dir in case of subdir
                print("Copy done")
            else:
                print('The file can\'t be copied to the Drive (file size exceeds 1 GB limit)')

        collab_paths.append(collab_path)
    print('collab_path',collab_paths)
    return collab_paths


def copy_datafiles_with_unicore(request, target, job, local_dir, relative_paths):

    from simqueue import unicore_client
    url = unicore_client.get_site(target)['url']
    access_token = get_access_token(request.user.social_auth.get())
    auth = unicore_client.get_oidc_auth("Bearer {}".format(access_token))
    headers_query = auth.copy()
    headers_query['Accept'] = 'application/json'
    storages = requests.get(url + '/storages', headers=headers_query, verify=False).json()['storages']
    home_url = [st for st in storages if "home" in st.lower()][0] + '/files'
    headers_upload = auth.copy()
    headers_upload['Content-Type'] = "application/octet-stream"

    # upload files
    remote_dir = home_url + "/neuromorphic/job_{}/".format(job.pk)
    remote_paths = []
    for relative_path in relative_paths:
        remote_path = os.path.join(remote_dir, relative_path)
        local_path = os.path.join(local_dir, relative_path)
        with open(local_path, 'rb') as fp:
            file_contents = fp.read()
        response = requests.put(remote_path, headers=headers_upload,
                                data=file_contents, verify=False)
        if response.status_code != 204:
            # bail out early
            break
        remote_paths.append(remote_path)

    return remote_paths
