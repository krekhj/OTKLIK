#!/bin/sh
set -e

# Браузеру с окном нужен дисплей, а на VPS его нет — поднимаем виртуальный.
if [ "${HEADLESS:-false}" != "true" ]; then
  display_num="${DISPLAY#:}"
  # после рестарта контейнера остаётся lock-файл, и Xvfb не стартует
  rm -f "/tmp/.X${display_num}-lock" "/tmp/.X11-unix/X${display_num}"
  Xvfb "${DISPLAY}" -screen 0 1366x900x24 -nolisten tcp >/dev/null 2>&1 &
fi

exec "$@"
