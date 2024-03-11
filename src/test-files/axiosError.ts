import axios from "axios";
import { LogVault } from "../LogVault";

new LogVault().withConsole();

(async function () {
  await axios({
    method: "get",
    url: "http://localhost:0000",
    timeout: 100
  });
})();
