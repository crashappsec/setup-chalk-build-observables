#!/usr/bin/env bash

set -eu

find /mnt/curiosity/observables/ -maxdepth 1 -type f -name "${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*_metadata.jsonl" | while read -r file; do
    prefix=$(basename "$file" | cut -d'_' -f1-3)
    /mnt/curiosity/co-jq -n --slurpfile events <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/${prefix}_events.jsonl) \
        --slurpfile metadata <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/${prefix}_metadata.jsonl) \
        '{events: $events[], metadata: $metadata[]}' \
        > "/mnt/curiosity/observables/${prefix}_pstree.json"
done


/mnt/curiosity/co-jq -cn \
  --slurpfile pstrees <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}_*pstree.json) \
  --slurpfile hostinfo <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/host_info.json) \
  '{pstrees: $pstrees[], hostInfo: $hostinfo[]}' \
  > /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.json


/mnt/curiosity/co-brotli \
    -o /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.br \
    /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.json
