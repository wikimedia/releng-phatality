FROM node:14.20.0

ARG DASHBOARDS_VERSION=2.2.0

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

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
