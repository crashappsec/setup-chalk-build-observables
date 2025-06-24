#!/usr/bin/env sh

set -eu

echo "Running observables collector inside /mnt/curiosity"
ls /mnt/curiosity
echo "Observables contents"
tail /mnt/curiosity/co-host.log

ls /mnt/curiosity/observables
echo "------1111111111111111111----"

for prefix in $(ls /mnt/curiosity/observables/${GITHUB_RUN_ID}*_metadata.jsonl | cut -d'_' -f1-2); do
  /mnt/curiosity/co-jq -n --slurpfile events <(/mnt/curiosity/co-jq --slurp "." ${prefix}_events.jsonl) \
       --slurpfile metadata <(/mnt/curiosity/co-jq --slurp "." ${prefix}_metadata.jsonl) \
       '{events: $events[], metadata: $metadata[].[0]}' \
       > /mnt/curiosity/observables/${prefix}_pstree.json
done

echo "------22222222222222-------"
ls /mnt/curiosity/observables

/mnt/curiosity/co-jq -cn \
  --slurpfile pstrees <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/*_pstree.json) \
  --slurpfile hostinfo <(/mnt/curiosity/co-jq --slurp "." /mnt/curiosity/observables/host_info.json) \
  '{pstrees: $pstrees[], hostInfo: $hostinfo[].[0]}' \
  > /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.json
echo "------ FINAL -------"
ls /mnt/curiosity/observables
echo "---------"
cat /mnt/curiosity/observables/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-observables.json
