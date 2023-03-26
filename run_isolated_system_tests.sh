#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/scripts/common-functions.sh"

function run_tests {
  npm run prettier-check-project "$@"
  run_playwright_tests "$@"
  make lein-test
}

function run_playwright_tests {
  if running_on_jenkins;
  then
    start-service test-runner
    return $(playwright_test_runner_exit_code)
  else
    npm run playwright:test "$@"
  fi
}

function playwright_test_runner_exit_code {
  docker ps --filter "status=exited"|grep test-runner|sed 's/.*\(Exited.*\) Less.*/\1/'|sed 's/.*\([0-9][0-9]*\).*/\1/'
}

function main {
  init_nodejs
  start-service test-runner
  return $(playwright_test_runner_exit_code)
}

main "$@"
