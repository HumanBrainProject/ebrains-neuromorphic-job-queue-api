from __future__ import print_function, unicode_literals
import sys
import json
import nmpi

tokens = {}
for username in sys.argv[1:]:
    print(username, end=" ")
    c = nmpi.Client(username)
    assert c.user_info["username"] == username
    tokens[c.user_info["id"]] = "Bearer " + c.token
print(json.dumps(tokens))
