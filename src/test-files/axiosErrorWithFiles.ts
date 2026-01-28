import axios from "axios";
import { LogVault } from "../LogVault";

new LogVault().withFiles();

(async function () {
  await axios({
    method: "get",
    url: "http://10.255.255.1",
    timeout: 100
  });
})();
