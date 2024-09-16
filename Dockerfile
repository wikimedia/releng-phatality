FROM node:14.20.1 AS base

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir /src && chown node: /src
USER node

FROM base AS test
WORKDIR /src
COPY --chown=node:node package.json ./
RUN npm install
COPY --chown=node:node . .
ENTRYPOINT npm test

FROM base AS dev
ARG DASHBOARDS_VERSION
RUN if [ -z "$DASHBOARDS_VERSION" ]; then echo DASHBOARDS_VERSION must be set using --build-arg DASHBOARDS_VERSION=x.y.z; exit 1; fi

# OpenSearch Dashboards stuff

# WARNING: This a 2.7GB repo. Use a shallow clone
RUN git clone --depth=1 --branch="$DASHBOARDS_VERSION" \
  https://github.com/opensearch-project/OpenSearch-Dashboards.git \
  /src/OpenSearch-Dashboards
RUN cd /src/OpenSearch-Dashboards && yarn osd bootstrap

# Phatality stuff
COPY --chown=node:node . /src/OpenSearch-Dashboards/plugins/phatality
RUN cd /src/OpenSearch-Dashboards/plugins/phatality && yarn build --opensearch-dashboards-version $DASHBOARDS_VERSION
