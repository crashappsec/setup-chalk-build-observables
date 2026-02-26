#!/usr/bin/env sh

set -eu

OBSERVABLES_DIR=/mnt/curiosity/observables
COMBINED=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.combined
OUTPUT=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.br

if [ "${CURIOSITY_DOOD:-}" = "1" ]; then
    # Does co-docker exist at this point? It should...
    docker ps

    # Combine and prepare all observables for the specific run-id and attempt
    docker exec co-docker \
        -e OBSERVABLES_DIR=${OBSERVABLES_DIR} \
        -e OBSERVABLES_PREFIX=${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT} \
        -e COMBINED=${COMBINED} \
        -e OUTPUT=${OUTPUT} \
        sh -c "cat ${OBSERVABLES_DIR}/${OBSERVABLES_PREFIX}*.jsonl > ${COMBINED} && /mnt/curiosity/co-brotli -q 5 -o ${OUTPUT} ${COMBINED}"

    # Grab combined observables file from host and make it visible on the container
    # running the current post-checkout action step, since this is the one that will
    # run chalk and set the data to our platform
    docker run --rm -v ${COMBINED}:/tmp-observables-combined docker:24-cli \
        sh -c "tar -C /tmp-observables-combined -c . || (echo 'Host path does not exist'; exit 1)" | tar -x -C ${COMBINED}
    ls -hlia ${OBSERVABLES_DIR}
    ls -hlia ${COMBINED}

    # Clean up akin to how is done on host-native case below
    docker exec co-docker
        -e COMBINED=${COMBINED} \
        -e OBSERVABLES_DIR=${OBSERVABLES_DIR} \
        -e OBSERVABLES_PREFIX=${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT} \
        sh -c "rm ${COMBINED} && rm ${OBSERVABLES_DIR}/${OBSERVABLES_PREFIX}*.jsonl"

    # Exit here, when we are done; what should happen next is chalk to pull the
    # combined file, akin to how it will do it in the host native setup.
    exit 0
fi

if [ -f "${OBSERVABLES_DIR}/host_info.json" ]; then
    cat "${OBSERVABLES_DIR}/host_info.json" > "${COMBINED}"
    echo >> "${COMBINED}"
fi

cat ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl >> ${COMBINED}
/mnt/curiosity/co-brotli -q 5 -o ${OUTPUT} ${COMBINED}
rm ${COMBINED}
rm ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl
