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

envsubst < /etc/coturn/coturn.conf > /etc/coturn/turnserver.conf

exec /usr/bin/turnserver -c /etc/coturn/turnserver.conf --no-daemon
