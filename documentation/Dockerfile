#
# docker build -t cnrsunic/neuromorphic_docs .
# docker run -p 443 -d cnrsunic/neuromorphic_docs
#

FROM nginx:1.9
MAINTAINER andrew.davison@unic.cnrs-gif.fr

COPY nginx_default /etc/nginx/conf.d/default.conf
COPY splash /usr/share/nginx/html
COPY developer_guide/_build/html /usr/share/nginx/html/developer_guide
COPY letsencrypt /etc/letsencrypt

RUN chmod a+r /usr/share/nginx/html
RUN chmod 0600 /etc/letsencrypt/live/www.hbpneuromorphic.eu/privkey.pem /etc/letsencrypt/live/www-staging.hbpneuromorphic.eu/privkey.pem /etc/letsencrypt/live/www-dev.hbpneuromorphic.eu/privkey.pem
