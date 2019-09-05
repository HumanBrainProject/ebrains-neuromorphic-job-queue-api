#
# Build an image for deploying the Neuromorphic Platform job manager
#
# To build the image, from the parent directory:
#   docker build -t nmpi_queue_server -f job_manager/Dockerfile .
#
# To run the application:
#  docker run -d -p 443 nmpi_queue_server
#
# To find out which port to access on the host machine, run "docker ps"
#
# To check the content of the docker container:
#   sudo docker run -it nmpi_server /bin/bash

FROM debian:buster-slim
MAINTAINER Andrew Davison <andrew.davison@unic.cnrs-gif.fr>

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update --fix-missing; apt-get -y -q install python-dev python-setuptools sqlite3 python-psycopg2 git supervisor build-essential python-numpy nginx-extras python-pip
RUN pip install --upgrade pip
RUN unset DEBIAN_FRONTEND

RUN pip install uwsgi

ENV SITEDIR /home/docker/site

COPY job_manager $SITEDIR
COPY packages /home/docker/packages
COPY simqueue /home/docker/simqueue
COPY quotas /home/docker/quotas
COPY build_info.json $SITEDIR

WORKDIR /home/docker
RUN pip install -r $SITEDIR/requirements.txt
ENV PYTHONPATH  /home/docker:/home/docker/site:/usr/local/lib/python2.7/dist-packages:/usr/lib/python2.7/dist-packages

WORKDIR $SITEDIR
RUN if [ -f $SITEDIR/db.sqlite3 ]; then rm $SITEDIR/db.sqlite3; fi
RUN python manage.py check
RUN python manage.py collectstatic --noinput
RUN unset PYTHONPATH

RUN echo "daemon off;" >> /etc/nginx/nginx.conf
RUN rm /etc/nginx/sites-enabled/default
RUN ln -s $SITEDIR/deployment/nginx-app.conf /etc/nginx/sites-enabled/
RUN ln -s $SITEDIR/deployment/supervisor-app.conf /etc/supervisor/conf.d/
RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 443
CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisor-app.conf"]
