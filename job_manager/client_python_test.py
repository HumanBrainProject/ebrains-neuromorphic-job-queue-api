import nmpi

c = nmpi.Client("jduperrier")
token = c.token
new_client = nmpi.Client("jduperrier", token=token)

job_id = c.submit_job(source="https://github.com/jonathanduperrier/helmholtz",
                      platform="BrainScaleS",
                      collab_id=1195,
                      inputs=[],
                      command="run.py")

#c.job_status

job = {
    'code': 'https://github.com/jonathanduperrier/helmholtz',
    'command': 'run.py',
    'hardware_platform': 'BrainScaleS',
    'collab_id': 1195,
    'user_id': self.user_info["id"]
}
result = self._post(self.resource_map["queue"], job)
