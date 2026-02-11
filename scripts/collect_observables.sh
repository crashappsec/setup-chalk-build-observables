#!/usr/bin/env sh

set -eu

OBSERVABLES_DIR=/mnt/curiosity/observables
COMBINED=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.combined
OUTPUT=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.br

if [ -f "${OBSERVABLES_DIR}/host_info.json" ]; then
    cat "${OBSERVABLES_DIR}/host_info.json" > "${COMBINED}"
    echo >> "${COMBINED}"
fi

cat ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl >> ${COMBINED}

/mnt/curiosity/co-brotli -q 5 -o ${OUTPUT} ${COMBINED}
rm ${COMBINED}
# XXX should be safe to remove these at this point
rm ${OBSERVABLES_DIR}/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*.jsonl
