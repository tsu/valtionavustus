#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/common-functions.sh"
readonly LEIN="$repo/lein"

function delete_temp_files_if_running_on_jenkins () {
  if running_on_jenkins; then
    echo "Deleting nvd temp files at ${WORKSPACE}/dctemp*"
    rm -rf ${WORKSPACE}/dctemp*
  fi
}

function lein_dep_check_for_project () {
  local project_dir=$1

  local EXIT=0
  cd "$repo/$project_dir"
  "$LEIN" nvd check || EXIT=$?
  delete_temp_files_if_running_on_jenkins
  return $EXIT
}

function lein_dep_check () {

  local EXIT=0
  cd "$repo"
  "$LEIN" nvd check || EXIT=$?
  delete_temp_files_if_running_on_jenkins
  return $EXIT
}

function download_temp_db_to_workspace_in_jenkins() {
  if running_on_jenkins; then
    remove_all_files_ignored_or_untracked_by_git
    export JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=${WORKSPACE}
  fi
}

function main {
  local EXIT=0

  set +o errexit
  download_temp_db_to_workspace_in_jenkins
  lein_dep_check_for_project "soresu-form" || EXIT=$?
  lein_dep_check_for_project "va-admin-ui" || EXIT=$?
  lein_dep_check || EXIT=$?
  set -o errexit

  return $EXIT
}

main "$@"
