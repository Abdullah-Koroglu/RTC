#!/bin/sh
set -eu

if [ -z "${TURN_SHARED_SECRET:-}" ]; then
  echo "TURN_SHARED_SECRET is required" >&2
  exit 1
fi

if [ -z "${TURN_EXTERNAL_IP:-}" ]; then
  echo "TURN_EXTERNAL_IP is required" >&2
  exit 1
fi

envsubst < /etc/coturn/coturn.conf > /tmp/turnserver.conf

exec /usr/bin/turnserver -c /tmp/turnserver.conf
