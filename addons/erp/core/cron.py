from typing import Literal
import asyncio
import datetime
import logging


logger = logging.getLogger('core.jobs')


class JobManager:
    jobs = set()

    @classmethod
    def add_job(cls, job_item):
        cls.jobs.add(job_item)

    @classmethod
    async def process_jobs(cls):
        for j in cls.jobs:
            await j.process()

    @classmethod
    async def jobs_loop(cls):
        while True:
            try:
                await cls.process_jobs()
            except Exception as e:
                logger.exception('Error processing jobs')
            await asyncio.sleep(60)


class JobItem:
    """
    Very simple job representation that runs a task at a specific hour and minute every day.
    """

    def __init__(self, target, *, hour: int | Literal['*'] = 0, minute=0, daily=False):
        self.target = target
        now = datetime.datetime.now()
        if hour == '*':
            hour = now.hour + 1
        self._next_execution = datetime.datetime(now.year, now.month, now.day, hour, minute)
        if daily and self._next_execution < datetime.datetime.now():
            self._next_execution += datetime.timedelta(days=1)

    async def run(self):
        self.target()

    async def process(self):
        if datetime.datetime.now() >= self._next_execution:
            try:
                await self.run()
            except Exception as e:
                logger.exception(f'Error executing job {self.target}')
            self._next_execution += datetime.timedelta(days=1)


def job(hour: int | Literal['*'] = 0, minute=0, daily=False):
    """
    Register a function as a scheduled job to be executed at a specific time.
    :param hour:
    :param minute:
    :param daily:
    :return:
    """

    def decorator(target):
        j = JobItem(target, hour=hour, minute=minute, daily=daily)
        JobManager.add_job(j)
        return target

    return decorator
