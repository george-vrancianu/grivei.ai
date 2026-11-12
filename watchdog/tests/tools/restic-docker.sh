#!/bin/sh
# restic from the official image, for machines without a restic binary (tests/test_backup.py; PIPELINE_RESTIC_BIN points here).
# PP37_RESTIC_MOUNTS is a colon-separated list of host directories to mount at the same path (the repository, the archive, the target).
mounts=""
IFS=:
for m in $PP37_RESTIC_MOUNTS; do mounts="$mounts -v $m:$m"; done
unset IFS
# shellcheck disable=SC2086
exec docker run --rm -i --name "pp37-restic-$$" --memory=256m --label pp37=pytest --user "$(id -u):$(id -g)" \
  -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e RESTIC_PASSWORD_FILE -e RESTIC_CACHE_DIR=/tmp/restic-cache -w "$PWD" $mounts restic/restic:0.18.1 "$@"
