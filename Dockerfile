FROM node:10

ARG DASHBOARDS_VERSION=1.2.0

RUN apt-get update
RUN apt-get upgrade -y

RUN mkdir /src && chown node: /src
USER node

# OpenSearch Dashboards stuff

# WARNING: This a 2.7GB repo and since we need to check out a tag, we can't
# use --depth=1. 
RUN git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git /src/OpenSearch-Dashboards
RUN git -C /src/OpenSearch-Dashboards checkout "tags/$DASHBOARDS_VERSION"
RUN cd /src/OpenSearch-Dashboards && yarn osd bootstrap

# Phatality stuff

ARG CACHEBUSTER
RUN echo $CACHEBUSTER > /dev/null
RUN git clone --depth=1 "https://gerrit.wikimedia.org/r/releng/phatality" /src/OpenSearch-Dashboards/plugins/phatality
RUN cd /src/OpenSearch-Dashboards/plugins/phatality && yarn build --opensearch-dashboards-version $DASHBOARDS_VERSION
