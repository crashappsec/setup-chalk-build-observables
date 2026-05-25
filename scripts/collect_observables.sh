#!/usr/bin/env sh

set -eu

CURIOSITY_DIR=${CURIOSITY_HOME:-/mnt/curiosity}
OBSERVABLES_DIR=${CURIOSITY_DIR}/observables
OBSERVABLES_PREFIX=${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}
COMBINED=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.combined
OUTPUT=${OBSERVABLES_DIR}/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.br

find_brotli() {
    if [ -n "${CURIOSITY_BROTLI_BIN:-}" ] && [ -x "${CURIOSITY_BROTLI_BIN}" ]; then
        echo "${CURIOSITY_BROTLI_BIN}"
        return 0
    fi
    if [ -n "${CURIOSITY_ROOT:-}" ] && [ -x "${CURIOSITY_ROOT}/co-brotli" ]; then
        echo "${CURIOSITY_ROOT}/co-brotli"
        return 0
    fi
    if [ -x "${CURIOSITY_DIR}/co-brotli" ]; then
        echo "${CURIOSITY_DIR}/co-brotli"
        return 0
    fi
    if command -v co-brotli > /dev/null 2>&1; then
        command -v co-brotli
        return 0
    fi
    if command -v brotli > /dev/null 2>&1; then
        command -v brotli
        return 0
    fi
    return 1
}

resolve_results_bundle() {
    if [ -n "${CURIOSITY_RESULTS_BUNDLE:-}" ] && [ -f "${CURIOSITY_RESULTS_BUNDLE}" ]; then
        echo "${CURIOSITY_RESULTS_BUNDLE}"
        return 0
    fi
    if [ -n "${CURIOSITY_ROOT:-}" ]; then
        bundle_path="$(pwd)/$(basename "${CURIOSITY_ROOT}").tar.gz"
        if [ -f "${bundle_path}" ]; then
            echo "${bundle_path}"
            return 0
        fi
    fi
    return 1
}

BROTLI_BIN=$(find_brotli) || {
    echo "Error: could not find co-brotli/brotli for observables compression"
    exit 1
}

TMP_DIR=
cleanup() {
    if [ -n "${TMP_DIR}" ] && [ -d "${TMP_DIR}" ]; then
        rm -rf "${TMP_DIR}"
    fi
}
trap cleanup EXIT

SOURCE_OBSERVABLES_DIR=${OBSERVABLES_DIR}
RESULTS_BUNDLE=$(resolve_results_bundle || true)
if [ -n "${RESULTS_BUNDLE}" ]; then
    TMP_DIR=$(mktemp -d)
    tar -xzf "${RESULTS_BUNDLE}" -C "${TMP_DIR}"
    SOURCE_OBSERVABLES_DIR="${TMP_DIR}/observables"
fi

mkdir -p "${OBSERVABLES_DIR}"

if [ ! -d "${SOURCE_OBSERVABLES_DIR}" ]; then
    echo "Warning: observables directory not found at ${SOURCE_OBSERVABLES_DIR}"
    exit 0
fi

emit_observables_from_dir() {
    source_dir="$1"

    if [ -f "${source_dir}/host_info.json" ]; then
        cat "${source_dir}/host_info.json" > "${COMBINED}"
        echo >> "${COMBINED}"
    else
        : > "${COMBINED}"
    fi

    found_jsonl=0
    for jsonl_file in "${source_dir}/${OBSERVABLES_PREFIX}"*.jsonl; do
        if [ -f "${jsonl_file}" ]; then
            cat "${jsonl_file}" >> "${COMBINED}"
            found_jsonl=1
        fi
    done

    if [ "${found_jsonl}" -eq 0 ] && [ ! -s "${COMBINED}" ]; then
        echo "Warning: no observables found for prefix ${OBSERVABLES_PREFIX}"
        rm -f "${COMBINED}"
        exit 0
    fi

    "${BROTLI_BIN}" -q 5 -o "${OUTPUT}" "${COMBINED}"
    rm -f "${COMBINED}"
}

if [ -n "${RESULTS_BUNDLE}" ]; then
    emit_observables_from_dir "${SOURCE_OBSERVABLES_DIR}"
    exit 0
fi

if [ "${CURIOSITY_DOOD:-}" = "1" ]; then
    docker ps

    docker exec co-docker \
        -e "OBSERVABLES_DIR=${OBSERVABLES_DIR}" \
        -e "OBSERVABLES_PREFIX=${OBSERVABLES_PREFIX}" \
        -e "BROTLI_BIN=${BROTLI_BIN}" \
        -e "COMBINED=${COMBINED}" \
        -e "OUTPUT=${OUTPUT}" \
        sh -c '
            if [ -f "${OBSERVABLES_DIR}/host_info.json" ]; then
                cat "${OBSERVABLES_DIR}/host_info.json" > "${COMBINED}"
            fi

            cat "${OBSERVABLES_DIR}/${OBSERVABLES_PREFIX}"*.jsonl >> "${COMBINED}" && "${BROTLI_BIN}" -q 5 -o "${OUTPUT}" "${COMBINED}"
        '

    mkdir -p "${OBSERVABLES_DIR}"
    docker run --rm -v "${OUTPUT}:/tmp-observables-output" docker:24-cli \
        sh -c "cat tmp-observables-output" > "${OUTPUT}"

    ls -hlia "${OBSERVABLES_DIR}"
    ls -hlia "${COMBINED}"
    ls -hlia "${OUTPUT}"

    docker exec co-docker \
        -e "COMBINED=${COMBINED}" \
        -e "OBSERVABLES_DIR=${OBSERVABLES_DIR}" \
        -e "OBSERVABLES_PREFIX=${OBSERVABLES_PREFIX}" \
        sh -c '
            rm "${COMBINED}" && rm "${OBSERVABLES_DIR}"/${OBSERVABLES_PREFIX}*.jsonl
        '
else
    emit_observables_from_dir "${SOURCE_OBSERVABLES_DIR}"
    rm -f "${OBSERVABLES_DIR}"/${OBSERVABLES_PREFIX}*.jsonl
fi
