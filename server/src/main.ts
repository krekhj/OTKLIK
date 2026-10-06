import { createApp } from "./app.js";
import { config, isLoopback } from "./config.js";
import { runStore } from "./shared/run/run.store.js";

// без авторизации наружу не открываемся: API принимает пароль от hh.ru
if (!config.auth && !isLoopback(config.host)) {
  console.error(
    `HOST=${config.host} открывает API в сеть — задай AUTH_USER и AUTH_PASSWORD.`,
  );
  process.exit(1);
}

// пароль на вход из .env.example или короткий — то же, что без пароля
if (config.auth && (config.auth.password.length < 12 || /change-me/i.test(config.auth.password))) {
  console.error("AUTH_PASSWORD слишком простой: нужен свой, от 12 символов.");
  process.exit(1);
}

const server = createApp();

server.listen(config.port, config.host, () => {
  console.log(
    `OTKLIK API: http://${config.host}:${config.port}` +
      ` · auth ${config.auth ? "on" : "off"} · headless ${config.headless}`,
  );
});

// закрываем браузер бота при остановке сервера
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    runStore.stop();
    server.close();
    server.closeAllConnections();
    setTimeout(() => process.exit(0), 1_000).unref();
  });
}
