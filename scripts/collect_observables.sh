#!/usr/bin/env sh

set -eu

CURIOSITY_DIR=/mnt/curiosity
OBSERVABLES_DIR=${CURIOSITY_DIR}/observables
BROTLI_BIN=${CURIOSITY_DIR}/co-brotli
COMBINED=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.combined
OUTPUT=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.br

if [ "${CURIOSITY_DOOD:-}" = "1" ]; then
    # Does co-docker exist at this point? It should...
    docker ps

    # Combine and prepare all observables for the specific run-id and attempt
    docker exec co-docker \
        -e OBSERVABLES_DIR=${OBSERVABLES_DIR} \
        -e OBSERVABLES_PREFIX=${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT} \
        -e BROTLI_BIN=${BROTLI_BIN} \
        -e COMBINED=${COMBINED} \
        -e OUTPUT=${OUTPUT} \
        sh -c '
            if [ -f "${OBSERVABLES_DIR}/host_info.json" ]; then
                cat "${OBSERVABLES_DIR}/host_info.json" > "${COMBINED}"
            fi

            cat "${OBSERVABLES_DIR}/${OBSERVABLES_PREFIX}"*.jsonl >> "${COMBINED}" && "${BROTLI_BIN}" -q 5 -o "${OUTPUT}" "${COMBINED}"
        '

    # Grab combined observables file from host and make it visible on the container
    # running the current post-checkout action step, since this is the one that will
    # run chalk and set the data to our platform
    mkdir -p ${OBSERVABLES_DIR}
    docker run --rm -v ${OUTPUT}:/tmp-observables-output docker:24-cli \
        sh -c "cat tmp-observables-output" > ${OUTPUT}

    ls -hlia ${OBSERVABLES_DIR}
    ls -hlia ${COMBINED}
    ls -hlia ${OUTPUT}

    # Clean up akin to how is done on host-native case below
    docker exec co-docker
        -e COMBINED=${COMBINED} \
        -e OBSERVABLES_DIR=${OBSERVABLES_DIR} \
        -e OBSERVABLES_PREFIX=${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT} \
        sh -c '
            rm "${COMBINED}" && rm "${OBSERVABLES_DIR}/${OBSERVABLES_PREFIX}*.jsonl"
        '
else
    if [ -f "${OBSERVABLES_DIR}/host_info.json" ]; then
        cat "${OBSERVABLES_DIR}/host_info.json" > "${COMBINED}"
        echo >> "${COMBINED}"
    fi

    cat ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl >> ${COMBINED}
    ${BROTLI_BIN} -q 5 -o ${OUTPUT} ${COMBINED}
    rm ${COMBINED}

    # XXX should be safe to remove these at this point
    rm ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl
fi
