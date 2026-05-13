FROM alpine:3.20

RUN apk add --no-cache coturn tini gettext libcap openssl netcat-openbsd \
  && setcap cap_net_bind_service=+ep /usr/bin/turnserver

COPY infra/coturn/coturn.conf /etc/coturn/coturn.conf
COPY infra/coturn/entrypoint.sh /entrypoint.sh

RUN chmod 0755 /entrypoint.sh \
  && (getent group turnserver >/dev/null 2>&1 || addgroup -S turnserver) \
  && (id -u turnserver >/dev/null 2>&1 || adduser -S -D -h /var/lib/turnserver -G turnserver turnserver) \
  && mkdir -p /var/lib/turnserver /etc/coturn/tls \
  && chown -R turnserver:turnserver /var/lib/turnserver /etc/coturn

USER turnserver

EXPOSE 3478/tcp 3478/udp 5349/tcp 49160-49170/udp

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=5 CMD nc -z 127.0.0.1 ${TURN_PORT:-3478} || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
