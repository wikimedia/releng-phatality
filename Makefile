CONTAINER_RUNTIME := $(shell which podman || which docker)
PHATALITY_VERSION := $(shell cat package.json | jq -r .version)
DASHBOARDS_VERSION := $(shell echo $(PHATALITY_VERSION) | rev | cut -d '.' -f 2- | rev)
BUILD_DIRECTORY := OpenSearch-Dashboards-${DASHBOARDS_VERSION}
NODE_VERSION := $(shell cat ${BUILD_DIRECTORY}/.node-version)
UPSTREAM_REPOSITORY := https://github.com/opensearch-project/OpenSearch-Dashboards.git
.PHONY: prepare test buildchown-node chown-root check-node-version deploy-phatality-code clean

prepare:
	@if [ ! -d "${BUILD_DIRECTORY}" ]; then git clone --depth 1 --branch ${DASHBOARDS_VERSION} ${UPSTREAM_REPOSITORY} ${BUILD_DIRECTORY}; fi
	@echo Build directory: ./${BUILD_DIRECTORY}

test: deploy-phatality-code chown-node
	${CONTAINER_RUNTIME} run -it --rm --name phatality-build \
	-v $$(pwd)/${BUILD_DIRECTORY}:/src:Z --workdir /src/plugins/phatality --user node \
	node:${NODE_VERSION} /bin/bash -c 'yarn install && yarn run test'

build: deploy-phatality-code chown-node
	# build artifact
	${CONTAINER_RUNTIME} run -it --rm --name phatality-build \
	-v $$(pwd)/${BUILD_DIRECTORY}:/src:Z --workdir /src --user node \
	node:${NODE_VERSION} \
	/bin/bash -c 'yarn osd bootstrap && cd plugins/phatality && yarn build --opensearch-dashboards-version ${PHATALITY_VERSION}'
	$(MAKE) chown-root
	# move artifact to cwd
	mv ${BUILD_DIRECTORY}/plugins/phatality/build/phatality-${PHATALITY_VERSION}.zip $$(pwd)/

chown-node: check-node-version
	# change ownership of bind mount to node
	${CONTAINER_RUNTIME} run -it --rm --name phatality-build \
	-v $$(pwd)/${BUILD_DIRECTORY}:/src:Z --workdir /src  --user root \
	node:${NODE_VERSION} \
	/bin/bash -c 'chown -R node:node /src'

chown-root: check-node-version
	# change ownership back to root
	${CONTAINER_RUNTIME} run -it --rm --name phatality-build \
	-v $$(pwd)/${BUILD_DIRECTORY}:/src:Z --workdir /src  --user root \
	node:${NODE_VERSION} \
	/bin/bash -c 'chown -R root:root /src'

check-node-version:
	@if [ -z "${NODE_VERSION}" ]; then echo 'Could not find node version.  Did you run "make prepare" first?' && exit 1; fi

deploy-phatality-code: check-node-version chown-root
	mkdir -p ${BUILD_DIRECTORY}/plugins/phatality
	cp -R public ${BUILD_DIRECTORY}/plugins/phatality/
	cp -R test ${BUILD_DIRECTORY}/plugins/phatality/
	cp package.json ${BUILD_DIRECTORY}/plugins/phatality/
	cp tsconfig.json ${BUILD_DIRECTORY}/plugins/phatality/
	cp tsconfig.ci.json ${BUILD_DIRECTORY}/plugins/phatality/
	cp .eslintrc.js ${BUILD_DIRECTORY}/plugins/phatality/
	cat opensearch_dashboards.json \
		| jq '.version = "$(PHATALITY_VERSION)" | .opensearchDashboardsVersion = "$(DASHBOARDS_VERSION)"' \
		| tee -p opensearch_dashboards.json
	cp opensearch_dashboards.json ${BUILD_DIRECTORY}/plugins/phatality/

clean: chown-root
	rm -rf ${BUILD_DIRECTORY}
