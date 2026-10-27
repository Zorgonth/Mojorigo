import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { store } from "./data/store.js";

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`Mojorigo backend listening on http://${config.host}:${config.port}`);
  console.log(
    `Loaded ${store.bins.length} bins, ${store.readings.length} readings, ${store.collections.length} collections`,
  );
});
