#!/usr/bin/env sh

set -eu

CURIOSITY_DIR=${CURIOSITY_HOME:-/mnt/curiosity}

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

TMP_DIR=
cleanup() {
    if [ -n "${TMP_DIR}" ] && [ -d "${TMP_DIR}" ]; then
        rm -rf "${TMP_DIR}"
    fi
}
trap cleanup EXIT

SOURCE_DIR=${CURIOSITY_DIR}
RESULTS_BUNDLE=$(resolve_results_bundle || true)
if [ -n "${RESULTS_BUNDLE}" ]; then
    TMP_DIR=$(mktemp -d)
    tar -xzf "${RESULTS_BUNDLE}" -C "${TMP_DIR}"
    SOURCE_DIR="${TMP_DIR}"
fi

has_crash_markers() {
    log_path="$1"
    if [ ! -f "${log_path}" ]; then
        return 1
    fi

    cnt=$(grep -c 'p 00000000' "${log_path}" 2> /dev/null) || cnt=0
    if [ "${cnt}" -gt 5 ]; then
        return 0
    fi

    cnt=$(grep -E -c 'FATAL: Uncaught signal|Address not mapped at|RAX 0x.*RBX 0x' "${log_path}" 2> /dev/null) || cnt=0
    if [ "${cnt}" -gt 1 ]; then
        return 0
    fi

    return 1
}

hostname

ls -hlia /mnt 2> /dev/null || true
pwd

ls -hlia "${SOURCE_DIR}"
pwd

ls -hlia "${SOURCE_DIR}/observables" 2> /dev/null || true
pwd

env

crash_found=0

for hostd_log in "${SOURCE_DIR}"/co-host*.log; do
    if has_crash_markers "${hostd_log}"; then
        crash_found=1
        break
    fi
done

if ls "${SOURCE_DIR}"/coredump.* > /dev/null 2>&1; then
    crash_found=1
fi

if [ "$crash_found" -eq 0 ]; then
    echo "no crash found - exiting"
    exit 0
fi

echo "crash found. collecting logs.."

file_list=""

for hostd_log in "${SOURCE_DIR}"/co-host*.log; do
    if [ -f "${hostd_log}" ]; then
        file_list="$file_list $(basename "${hostd_log}")"
    fi
done

for core_file in "${SOURCE_DIR}"/coredump.*; do
    if [ -f "$core_file" ]; then
        echo "collecting coredump $core_file"
        file_list="$file_list $(basename "$core_file")"
    fi
done

for strace_file in "${SOURCE_DIR}"/straced_monitor*.log; do
    if [ -f "$strace_file" ]; then
        echo "collecting strace log $strace_file"
        file_list="$file_list $(basename "$strace_file")"
    fi
done

for extra_log in runc.log runc.global.log; do
    if [ -f "${SOURCE_DIR}/${extra_log}" ]; then
        echo "collecting extra log ${SOURCE_DIR}/${extra_log}"
        file_list="$file_list ${extra_log}"
    fi
done

if [ -n "$file_list" ]; then
    if ! command -v tar > /dev/null 2>&1; then
        echo "Error: tar command not found. Cannot create log bundle."
        exit 1
    fi
    # $file_list intentionally unquoted for word splitting
    tar -C "${SOURCE_DIR}" -czf "${CURIOSITY_DIR}"/curiosity_logs.bundle $file_list
    echo "Logs collected in ${CURIOSITY_DIR}/curiosity_logs.bundle"
else
    echo "Warning: No log files found to archive"
fi
