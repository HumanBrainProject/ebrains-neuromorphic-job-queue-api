'''local exceptions'''


class DocException(Exception):
    '''local exception'''
    pass


class DocArgumentException(DocException):
    '''Wrong arguments provided'''
    pass


class DocForbiddenException(DocException):
    '''403 forbidden'''
    pass


class DocNotFoundException(DocException):
    '''404 not found'''
    pass
