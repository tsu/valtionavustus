#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

readonly repo="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
readonly VA_SECRETS_REPO="$repo/../valtionavustus-secret"
readonly node_version="16.17.1"
readonly ansible_version="4.6.0"
readonly python_version="3.9.0"
readonly local_docker_namespace="va"

readonly HAKIJA_HOSTNAME=${HAKIJA_HOSTNAME:-"localhost"}
readonly VIRKAILIJA_HOSTNAME=${VIRKAILIJA_HOSTNAME:-"localhost"}
readonly DOCKER_COMPOSE_FILE="$repo"/docker-compose-test.yml
readonly PLAYWRIGHT_COMPOSE_FILE="$repo"/docker-compose-playwright-test.yml

function remove_all_files_ignored_or_untracked_by_git {
  git clean -xdf
}

function install_docker_compose {
  echo "Installing docker compose"
  curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o "$repo"/scripts/docker-compose
  chmod u+x "$repo"/scripts/docker-compose
  "$repo"/scripts/docker-compose --version
}

function check_requirements {
  if ! [[ -x "$(command -v curl)" ]]; then
    echo "Curl is required, cannot continue"
    exit 1
  fi
}

function make_clean() {
  time make clean
}

function make_build() {
  add_git_head_snippets
  time make build
}

function add_git_head_snippets() {
  echo "Adding git head snippets..."
  git show --pretty=short --abbrev-commit -s HEAD > "$repo"/server/resources/public/git-HEAD.txt
}

function build_docker_images {
  docker build -t "rcs-fakesmtp:latest" -f "$repo"/Dockerfile.rcs-fakesmtp ./
  docker build -t "va-virkailija:latest" -f "$repo"/Dockerfile.virkailija ./
  docker build -t "va-hakija:latest" -f "$repo"/Dockerfile.hakija ./
  docker build -t "playwright-test-runner:latest" -f "$repo"/Dockerfile.playwright-test-runner ./
}

function docker-compose () {
    if running_on_jenkins; then
      "$repo"/scripts/docker-compose "$@"
    else
      docker compose "$@"
    fi
}

function stop_system_under_test () {
  echo "Stopping system under test"
  local compose_file="$1"
  docker-compose -f "$compose_file" down --remove-orphans
}

function stop_systems_under_test  {
  echo "Stopping all systems under test"
  fix_directory_permissions_after_playwright_run
  stop_system_under_test "${DOCKER_COMPOSE_FILE}"
  stop_system_under_test "${PLAYWRIGHT_COMPOSE_FILE}"
}

function fix_directory_permissions_after_playwright_run {
  echo "Fixing directory permissions after Playwright run"

  set +e
  JENKINS_ID="$(id -u jenkins)"
  JENKINS_GID="$(id -g jenkins)"

  docker run \
    --env JENKINS_ID="${JENKINS_ID}" \
    --env JENKINS_GID="${JENKINS_GID}" \
    --rm \
    -v "$repo"/playwright-results:/playwright-results bash:latest bash -c "chown -R ${JENKINS_ID}:${JENKINS_GID} /playwright-results"

  set -e
}

function start_system_under_test () {
  echo "Starting system under test"
  local compose_file="$1"

  docker-compose -f "$compose_file" up -d hakija
  wait_for_container_to_be_healthy va-hakija

  docker-compose -f "$compose_file" up -d virkailija
  wait_for_container_to_be_healthy va-virkailija

  make_sure_all_services_are_running_and_follow_their_logs "$compose_file"
}

function make_sure_all_services_are_running_and_follow_their_logs {
  local compose_file="$1"
  docker-compose -f "$compose_file" up -d
  docker-compose -f "$compose_file" logs --follow &
}

function run_tests() {
  echo "Running isolated system tests"
  export HEADLESS=true
  export PLAYWRIGHT_WORKERS=6
  export SPECLJ_ARGS="-f junit"

  "$repo"/run_isolated_system_tests.sh
}

function parse_env_from_script_name {
  local BASE_FILENAME="$1"
  FILE_NAME=$(basename "$0")
  if echo "${FILE_NAME}" | grep -E -q "$BASE_FILENAME-.([^-]+)\.sh"; then
    ENV=$(echo "${FILE_NAME}" | sed -E -e "s|$BASE_FILENAME-([^-]+)\.sh|\1|g")
    export ENV
    echo "Targeting environment [${ENV}]"
  else
    echo >&2 "Don't call this script directly"
    exit 1
  fi
}

function running_on_jenkins {
  [ "${JENKINS_HOME:-}" != "" ]
}

function init_nodejs {
  export NVM_DIR="${NVM_DIR:-$HOME/.cache/nvm}"
  set +o errexit
  source "$repo/nvm.sh"
  nvm use "${node_version}" || nvm install "${node_version}"
  set -o errexit
}

function npm_ci_if_package_lock_has_changed {
  info "Checking if npm ci needs to be run"
  require_command shasum
  local -r checksum_file=".package-lock.json.checksum"

  function run_npm_ci {
    npm ci
    shasum package-lock.json > "$checksum_file"
  }

  if [ ! -f "$checksum_file" ]; then
    echo "new package-lock.json; running npm ci"
    run_npm_ci
  elif ! shasum --check "$checksum_file"; then
    info "package-lock.json seems to have changed, running npm ci"
    run_npm_ci
  else
    info "package-lock.json doesn't seem to have changed, skipping npm ci"
  fi
}

function wait_until_port_is_listening {
  require_command nc
  local -r port="$1"

  info "Waiting until port $port is listening"
  while ! nc -z localhost "$port"; do
    sleep 1
  done
}

function require_docker {
  require_command docker
  docker ps > /dev/null 2>&1 || { echo >&2 "Running 'docker ps' failed. Is docker daemon running? Aborting."; exit 1; }
}

function wait_for_container_to_be_healthy {
  require_command docker
  local -r container_name="$1"

  info "Waiting for docker container $container_name to be healthy"
  until [ "$(docker inspect -f {{.State.Health.Status}} "$container_name" 2>/dev/null || echo "not-running")" == "healthy" ]; do
    sleep 2;
  done;
}

function require_command {
  if ! command -v "$1" > /dev/null; then
    fatal "I require $1 but it's not installed. Aborting."
  fi
}

function info {
  log "INFO" "$1"
}

function fatal {
  log "ERROR" "$1"
  exit 1
}

function log {
  local -r level="$1"
  local -r message="$2"
  local -r timestamp=$(date +"%Y-%m-%d %H:%M:%S")

  >&2 echo -e "${timestamp} ${level} ${message}"
}

function ansible-playbook {
  ansible-command "ansible-playbook" "$@"
}

function ansible-vault {
  ansible-command "ansible-vault" "$@"
}

function ansible-command {
  local -r command="$1"
  shift
  local -r image="${local_docker_namespace}/${command}"
  local -r tag="${python_version}-${ansible_version}"
  local -r ansible_vault_password_file=$(mktemp)
  local -r ssh_config=$(mktemp)
  local -r docker_work_dir=/servers
  local -r user=$(whoami)

  trap "rm -f ${ansible_vault_password_file} ${ssh_config}" EXIT
  local -r password=$("${repo}/servers/gpg-wrapper.sh")

  cat <<EOF > "$ansible_vault_password_file"
#!/usr/bin/env bash
echo "${password}"
EOF
  chmod u+x "$ansible_vault_password_file"

  cat <<EOF > "$ssh_config"
Host *
  User ${user}
EOF

  if ! docker image inspect ${image}:${tag} 2>&1 > /dev/null; then
    docker build \
           --tag ${image}:${tag} \
           - <<EOF
FROM python:${python_version}
RUN apt-get update && apt-get -y install vim
RUN pip3 install ansible==${ansible_version}
WORKDIR ${docker_work_dir}
ENTRYPOINT ["$command"]
EOF
  fi

  docker run \
         --rm \
         --tty \
         --interactive \
         --volume "${repo}/servers":"${docker_work_dir}" \
         --volume "${ssh_config}":"${docker_work_dir}/ssh.config" \
         --volume "${ansible_vault_password_file}":"${docker_work_dir}/gpg-wrapper.sh" \
         --volume "${VA_SECRETS_REPO}/servers/va-secrets-vault.yml":"${docker_work_dir}/group_vars/all/vault.yml" \
         --volume "${VA_SECRETS_REPO}/servers/va-secrets-qa-vault.yml":"${docker_work_dir}/group_vars/va_app_qa/vault.yml" \
         --volume "${VA_SECRETS_REPO}/servers/va-secrets-prod-vault.yml":"${docker_work_dir}/group_vars/va_app_prod/vault.yml" \
         --volume "${VA_SECRETS_REPO}/config":"${docker_work_dir}/config" \
         --env SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock" \
         --mount type=bind,src=/run/host-services/ssh-auth.sock,target=/run/host-services/ssh-auth.sock \
         ${image}:${tag} \
         "$@"
}
