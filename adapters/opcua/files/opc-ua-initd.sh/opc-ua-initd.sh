#!/bin/sh

set -e

### BEGIN INIT INFO
# Provides:           opc-ua-go-adapter
# Required-Start:     $network $local_fs $syslog $remote_fs $named $portmap
# Required-Stop:      $network $local_fs $syslog $remote_fs $named $portmap
# Default-Start:      2 3 4 5
# Default-Stop:       0 1 6
# Short-Description:  ClearBlade OPC UA Go Adapter
### END INIT INFO

. /etc/default/opc-ua-go-adapter
. /etc/init.d/functions

PATH=/usr/sbin:/usr/bin:/sbin:/bin

#Make sure there is no whitespace after any "\" continuation characters.
ADAPTER_FLAGS="-logLevel=info"

start() {
    echo "Starting ClearBlade OPC UA Go Adapter..."

    start-stop-daemon --start --quiet --oknodo --background --pidfile $ADAPTER_PIDFILE --make-pidfile \
    --startas /bin/bash -- -c "exec $ADAPTER $ADAPTER_FLAGS > $ADAPTER_LOGS 2>&1"
}

stop() {
    echo "Stopping ClearBlade OPC UA Go Adapter..."
    start-stop-daemon --stop --quiet --oknodo --pidfile $ADAPTER_PIDFILE --retry 10
    rm -f $ADAPTER_PIDFILE
}

case "$1" in
    start)
        start
        ;;

    stop)
        stop
        ;;

    restart)
        stop
        start
        ;;

    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac