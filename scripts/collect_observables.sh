#!/bin/bash

set -e

echo "Running observables collector"

for prefix in $(ls /mnt/curiosity/observables/${GITHUB_RUN_ID}*_metadata.jsonl | cut -d'_' -f1-2); do
  jq -n --slurpfile events <(jq --slurp "." ${prefix}_events.jsonl) \
       --slurpfile metadata <(jq --slurp "." ${prefix}_metadata.jsonl) \
       '{events: $events[], metadata: $metadata[].[0]}' \
       > ${prefix}_pstree.json
done

jq -cn \
  --slurpfile pstrees <(jq --slurp "." /mnt/curiosity/observables/*_pstree.json) \
  --slurpfile hostinfo <(jq --slurp "." /mnt/curiosity/observables/host_info.json) \
  '{pstrees: $pstrees[], hostInfo: $hostinfo[].[0]}' \
  > /mnt/curiosity/observables/${GITHUB_RUN_ID}_info.json
