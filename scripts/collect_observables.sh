#!/usr/bin/env bash

set -eu

echo "parsing observables data from /mnt/curiosity"

for prefix in "$(ls /mnt/curiosity/observables/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*_metadata.jsonl | cut -d'_' -f1-3)"; do
    echo "Parsing data for $prefix"
done

ls /mnt/curiosity/observables/

for prefix in "$(ls /mnt/curiosity/observables/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}*_metadata.jsonl | cut -d'_' -f1-3)"; do
    /mnt/curiosity/co-jq -n --slurpfile events <(/mnt/curiosity/co-jq --slurp "." ${prefix}_events.jsonl) \
        --slurpfile metadata <(/mnt/curiosity/co-jq --slurp "." ${prefix}_metadata.jsonl) \
        '{events: $events[], metadata: $metadata[]}' \
        > "${prefix}_pstree.json"
done

ls /mnt/curiosity/observables/

/mnt/curiosity/co-jq -cn \
  --slurpfile pstrees <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}_*pstree.json) \
  --slurpfile hostinfo <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/host_info.json) \
  '{pstrees: $pstrees[], hostInfo: $hostinfo[]}' \
  > /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.json
