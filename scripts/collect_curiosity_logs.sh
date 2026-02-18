#!/usr/bin/env sh

set -eu

CURIOSITY_DIR=/mnt/curiosity
# must match setup.sh logs in curiosity-release/wrap_github/setup.sh
HOSTD_LOGS=/mnt/curiosity/co-host.log

ls -hlia /mnt/curiosity

ls -hlia /mnt/curiosity/observables


crash_found=0

if [ -f "${HOSTD_LOGS}" ]; then
    cnt=$(grep -c 'p 00000000' "${HOSTD_LOGS}" 2>/dev/null) || cnt=0
    if [ "${cnt}" -gt 5 ]; then
        crash_found=1
    fi

    cnt=$(grep -E -c 'FATAL: Uncaught signal|Address not mapped at|RAX 0x.*RBX 0x' "${HOSTD_LOGS}" 2>/dev/null) || cnt=0
    if [ "${cnt}" -gt 1 ]; then
        crash_found=1
    fi
fi


if ls ${CURIOSITY_DIR}/coredump.* >/dev/null 2>&1; then
    crash_found=1
fi

if [ $crash_found -eq 0 ]; then
    echo "no crash found - exiting"
    exit 0
fi

echo "crash found. collecting logs.."

file_list=""

if [ -f "${HOSTD_LOGS}" ]; then
    file_list=${HOSTD_LOGS}
fi

for core_file in "${CURIOSITY_DIR}"/coredump.*; do
    if [ -f "$core_file" ]; then
        echo "collecting coredump $core_file"
        file_list="$file_list $core_file"
    fi
done

for strace_file in "${CURIOSITY_DIR}"/straced_monitor*.log; do
    if [ -f "$strace_file" ]; then
        echo "collecting strace log $strace_file"
        file_list="$file_list $strace_file"
    fi
done

if [ -n "$file_list" ]; then
    if ! command -v tar >/dev/null 2>&1; then
        echo "Error: tar command not found. Cannot create log bundle."
        exit 1
    fi
    tar -czf "${CURIOSITY_DIR}"/curiosity_logs.bundle "$file_list"
    echo "Logs collected in ${CURIOSITY_DIR}/curiosity_logs.bundle"
else
    echo "Warning: No log files found to archive"
fi
