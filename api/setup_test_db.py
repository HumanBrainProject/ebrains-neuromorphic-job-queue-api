"""
docker run --name nmpidb -e POSTGRES_PASSWORD=sehgc98y94t  -p 32768:5432 -d postgres:14

echo "CREATE DATABASE nmpi; CREATE USER test_user PASSWORD 'abc123'; ALTER DATABASE nmpi OWNER TO test_user;" | psql -h localhost -p 32768 -U postgres

"""

import asyncio
from datetime import datetime, timedelta, date
import os
import random
from uuid import UUID, uuid4

from faker import Faker
import asyncpg
import sqlalchemy

from simqueue import settings

assert settings.DATABASE_PASSWORD == "abc123"
assert settings.DATABASE_USERNAME == "test_user"

from simqueue import db


fake = Faker()

job_status_options = ["submitted", "running", "finished", "error"]
project_status_options = ["under review", "accepted", "rejected", "in preparation"]
hardware_platform_options = ["BrainScaleS", "BrainScaleS-2", "SpiNNaker", "Spikey", "Demo"]
tags = ["test"] + fake.words(10)


async def create_fake_tag(database, tag):
    ins = db.taglist.insert().values(name=tag, slug=fake.word())
    await database.execute(ins)


async def add_tag(database, job_id, tag):
    # get tag id
    query = db.taglist.select().where(db.taglist.c.name == tag)
    tag_obj = await database.fetch_one(query)
    ins = db.tagged_items.insert().values(
        object_id=job_id, tag_id=tag_obj["id"], content_type_id=fake.random_int()
    )
    await database.execute(ins)


async def add_comment(database, job_id, user_id, content, timestamp):
    ins = db.comments.insert().values(
        content=content, created_time=timestamp, user=user_id, job_id=job_id
    )
    comment_id = await database.execute(ins)


async def create_specific_job(database):
    # this is a job we expect to find when running the tests
    await database.execute("ALTER SEQUENCE simqueue_job_id_seq RESTART WITH 142972")
    job = dict(
        code="import sPyNNaker as sim\nsim.setup()",
        command="",
        status="finished",
        collab_id="neuromorphic-testing-private",
        user_id="adavison",
        hardware_platform="SpiNNaker",
        timestamp_submission=datetime(2021, 3, 10, 15, 16, 17),
        timestamp_completion=datetime(2021, 3, 10, 16, 17, 18),
    )
    ins = db.jobs.insert().values(**job)
    job_id = await database.execute(ins)
    await add_tag(database, job_id, "test")
    await add_comment(
        database, job_id, "stanlaurel", "This is a comment", datetime(2021, 3, 10, 17, 18, 19)
    )


async def create_fake_job(database):
    job = dict(
        code=fake.text(),
        command=fake.sentence(),
        collab_id=fake.word(),
        user_id=fake.user_name(),
        status=random.choice(job_status_options),
        hardware_platform=random.choice(hardware_platform_options),
        hardware_config=str(fake.pydict()),
        timestamp_submission=fake.date_time_this_decade(),
    )
    # todo: add provenance, resource_usage for finished jobs
    if job["status"] in ("completed", "error"):
        job["timestamp_completion"] = job["timestamp_submission"] + timedelta(
            random.uniform(0, 1000)
        )
    ins = db.jobs.insert().values(**job)
    job_id = await database.execute(ins)
    assert isinstance(job_id, int)

    # tag some jobs
    if random.random() < 0.5:
        await add_tag(database, job_id, random.choice(tags))


async def create_specific_project(database):
    # this is a project we expect to find when running the tests
    project = dict(
        context=uuid4(),
        collab="neuromorphic-testing-private",
        owner="adavison",
        title="Some project",
        abstract="Abstract goes here",
        description="",
        duration=42,  # in days
        start_date=None,
        accepted=False,
        submission_date=date(2016, 3, 4),
        decision_date=None,
    )

    ins = db.projects.insert().values(**project)
    await database.execute(ins)


async def create_fake_quota(database, project_id):
    quota_data = {
        "units": fake.word(),
        "limit": random.uniform(0.1, 10000),
        "usage": 0.0,
        "platform": random.choice(hardware_platform_options),
        "project_id": project_id,
    }

    ins = db.quotas.insert().values(**quota_data)
    await database.execute(ins)


async def create_fake_project(database, status):
    project = dict(
        context=uuid4(),
        collab=fake.word(),
        owner=fake.user_name(),
        title=fake.sentence(),
        abstract=fake.paragraph(),
        description=fake.text(),
        duration=random.randint(0, 100),  # in days
        start_date=None,
        accepted=False,
        submission_date=None,
        decision_date=None,
    )

    # Project status
    # - no submission_date:                             "in preparation"
    # - submission_date, accepted=False:                "under review"
    # - submission_date, decision_date, accepted=True:  "accepted"
    # - submission_date, decision_date, accepted=False: "rejected"

    if status == "in preparation":
        pass
    else:
        project["submission_date"] = fake.date_this_decade()
        if status == "under review":
            pass
        else:
            project["decision_date"] = project["submission_date"] + timedelta(
                days=random.randint(1, 10)
            )
            if status == "accepted":
                project["accepted"] = True
                project["start_date"] = project["decision_date"]
            else:
                assert status == "rejected"

    ins = db.projects.insert().values(**project)
    await database.execute(ins)

    if status == "accepted":
        for i in range(random.randint(0, 4)):
            await create_fake_quota(database, project["context"])


async def create_fake_data(database):
    for tag in tags:
        await create_fake_tag(database, tag)
    for i in range(20):
        await create_fake_job(database)
    for status in ("in preparation", "under review", "accepted", "rejected"):
        for i in range(6):
            await create_fake_project(database, status)


async def create_apikey(database):
    if "NMPI_TESTING_APIKEY" in os.environ:
        ins = db.api_keys.insert().values(
            key=os.environ["NMPI_TESTING_APIKEY"],
            user_id=4,
            created=fake.date_time_this_decade(),
        )
        await database.execute(ins)


async def main():

    await db.database.connect()

    dialect = sqlalchemy.dialects.postgresql.dialect()

    # drop tables to ensure we start with an empty db
    for table in db.metadata.tables.values():
        cmd = sqlalchemy.schema.DropTable(table)
        query = str(cmd.compile(dialect=dialect)) + " CASCADE"  # this feels like a hack
        try:
            await db.database.execute(query=query)
        except asyncpg.exceptions.UndefinedTableError:
            pass

    # create tables
    for table in db.metadata.tables.values():
        schema = sqlalchemy.schema.CreateTable(table, if_not_exists=True)
        query = str(schema.compile(dialect=dialect))
        await db.database.execute(query=query)

    # add fake data
    await create_fake_data(db.database)

    # add test data we specifically test for
    await create_specific_job(db.database)
    await create_specific_project(db.database)
    await create_apikey(db.database)

    await db.database.disconnect()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(main())
