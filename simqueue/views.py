import logging
from django.shortcuts import render
from django.template.context import RequestContext
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json
import requests
import ebrains_drive
from ebrains_drive.client import DriveApiClient
from django.conf import settings

import os.path
import tempfile
import shutil
import mimetypes
from simqueue.models import Job

from urllib.parse import urlparse
from urllib.request import urlretrieve
import errno

logger = logging.getLogger("simqueue")


def convert_bytes(size_in_bytes,unit):
    size_units = ['bytes', 'KB', 'MB', 'GB', 'TB']
    return size_in_bytes/(1024**size_units.index(unit))


def get_file_size(file_path, unit):
    if os.path.isfile(file_path):
        file_info = os.stat(file_path)
        return convert_bytes(file_info.st_size, unit)


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
            os.makedirs(dir, exist_ok=True)
            local_path = os.path.join(dir, relative_path)
            urlretrieve(url, local_path)
        # upload files
        if target == "drive":
            target_paths = copy_datafiles_to_collab_drive(request, job, local_dir, relative_paths)
        elif target == "bucket":
            target_paths = copy_datafiles_to_collab_bucket(request, job, local_dir, relative_paths)
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


def copy_datafiles_to_collab_drive(request, job, local_dir, relative_paths):

    size_limit = 1.

    access_token = request.META.get('HTTP_AUTHORIZATION').replace("Bearer ", "")
    ebrains_drive_client = ebrains_drive.connect(token=access_token)

    collab_name = job.collab_id
    target_repository = ebrains_drive_client.repos.get_repo_by_url(collab_name)
    seafdir = target_repository.get_dir('/')
    collab_folder = "/job_{}".format(job.pk)
    # Check for existence of the directory
    try:
        dir = target_repository.get_dir(collab_folder)  # exists
    except:
        # The directory does not yet exist - Creation of the subdirectory
        dir = seafdir.mkdir(collab_folder)

    collab_paths = []
    status = []
    for relative_path in relative_paths:
        collab_path = os.path.join(collab_folder, relative_path)
        splitted_collab_path = collab_path.split('/')
        subdirectory = collab_folder
        if os.path.dirname(relative_path):  # if there are subdirectories...
            for d in range(2, len(splitted_collab_path)-1):
                subdirectory += '/'+splitted_collab_path[d]
                # Check for existence of the subdirectory
                try:
                    target_repository.get_dir(subdirectory)
                    # The subdirectory exists
                except:
                    # The subdirectory does not yet exist - Creation of the subdirectory
                    seafdir.mkdir(subdirectory)
        local_path = os.path.join(local_dir, relative_path)
        try:
            state = 'Exists'
            target_repository.get_file(collab_path)
            # The file exists already in the target repository
        except:
            file_size = get_file_size(local_path, 'GB')
            # No file yet - Copy the file to destination directory
            if file_size < size_limit:
                dir = target_repository.get_dir(subdirectory)
                dir.upload_local_file(local_path)  # Copy done
                state = 'Copied'
            else:
                state = ['Oversized', file_size]
                # The file can't be copied to the Drive (file size exceeds 1 GB limit)
        collab_paths.append(relative_path)
        status.append(state)

    return collab_paths, status
    

def copy_datafiles_to_collab_bucket(request, job, local_dir, relative_paths):
    
    size_limit = 100. # in GB - Maybe not useful for the bucket - Implemented for the future

    access_token = request.META.get('HTTP_AUTHORIZATION')
    auth_header = {
        "Authorization": f"{access_token}"
    }
    data_proxy_endpoint = "https://data-proxy.ebrains.eu/api"
    bucket_name = job.collab_id
    bucket_folder = "/job_{}".format(job.pk)

    # Check for existence of the bucket (By default, the collab bucket is not created)
    response = requests.get(f"{data_proxy_endpoint}/buckets/{bucket_name}", headers=auth_header) 
    if(response.status_code == 404): # Init the bucket
        response = requests.post(
            f"{data_proxy_endpoint}/buckets", 
            headers=auth_header, 
            json={
                "bucket_name": bucket_name
            })

    collab_paths = []
    status = []
    for relative_path in relative_paths:
        bucket_path = os.path.join(bucket_folder, relative_path)
        local_path = os.path.join(local_dir, relative_path)

        # Check for existence of the file in the bucket
        object = requests.get(f"{data_proxy_endpoint}/buckets/{bucket_name}?prefix={bucket_path[1:]}&limit=50",
                            headers=auth_header)

        if len(object.json()['objects']) == 0:  # The file does not exists in the target repository
            file_size = get_file_size(local_path, 'GB')
            if file_size < size_limit: 
                temporary_url_ul = requests.put(f"{data_proxy_endpoint}/buckets/{bucket_name}{bucket_path}", 
                                                headers=auth_header)
                response = requests.put(temporary_url_ul.json()["url"], 
                                        data=open(local_path, 'rb').read()) # Copy done
                state = 'Copied'
            else:
                state = ['Oversized', file_size]
                # The file can't be copied to the bucket (file size exceeds the limit)

        else:   # The file exists already in the target repository
            state = 'Exists'
    
        collab_paths.append(relative_path)
        status.append(state)

    return collab_paths, status


def copy_datafiles_with_unicore(request, target, job, local_dir, relative_paths):

    from simqueue import unicore_client
    url = unicore_client.get_site(target)['url']
    access_token = request.META.get('HTTP_AUTHORIZATION')
    auth = unicore_client.get_oidc_auth(access_token)
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
