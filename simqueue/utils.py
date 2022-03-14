import os
import json
import shutil
import ebrains_drive


def filter_ipynb_content(content_in):
    cells = json.loads(content_in)["cells"]
    sections = []
    for cell in cells:
        if cell["cell_type"] == "code":
            sections.append("".join(cell["source"]))
        elif cell["cell_type"] == "markdown":
            sections.append('"""\n' + "".join(cell["source"]) + '\n"""')
    content_out = "\n\n".join(sections)
    return content_out


def _copy_code_file_from_collab_drive(file_obj, local_dir, get_temporary_url):
    # put the file content into the "code" field directly
    root, ext = os.path.splitext(file_obj.path)
    content = file_obj.get_content()
    breakpoint()
    if ext == '.ipynb':
        content = filter_ipynb_content(content)
    elif ext in ('.zip', '.tgz', '.gz'):
        with open(os.path.join(local_dir, file_obj.name), 'wb') as fp:
            fp.write(content)
        temporary_url = get_temporary_url(file_obj.name)
        content = temporary_url
    # logger.debug(content)
    return content


def _copy_code_dir_from_collab_drive(dir_obj, local_dir, get_temporary_url):
    # create a zip archive and put its url into the "code" field
    joinp = os.path.join
    zipfile_name = f"{dir_obj.name}.zip"
    dir_obj.download(name=zipfile_name)
    shutil.move(zipfile_name, local_dir)
    temporary_url = get_temporary_url(zipfile_name)
    return temporary_url


def copy_code_from_collab_drive(ebrains_drive_client, collab_id, code_location, local_dir, get_temporary_url):
    """
    Download code from Collab Drive storage
    """
    target_repository = ebrains_drive_client.repos.get_repo_by_url(collab_id)

    try:
        seafdir = target_repository.get_dir(code_location)
        code_field = _copy_code_dir_from_collab_drive(seafdir, local_dir, get_temporary_url)
    except ebrains_drive.exceptions.DoesNotExist:
        code_dir, code_file = os.path.split(code_location)
        seafdir = target_repository.get_dir(code_dir)
        entity_list = seafdir.ls(entity_type="file")
        seaffile = None
        for e in entity_list:
            if e.name == code_file:
                seaffile = e
        if seaffile is None:
            raise Exception()  # need something more specific
        code_field = _copy_code_file_from_collab_drive(seaffile, local_dir, get_temporary_url)
    
    return code_field
        



