// import axios from "axios";
import { LogVault } from ".";

const logger = new LogVault().withLoki({
  host: "http://localhost:4678"
});

// throw new Error("some error");

// axios.get("http://localhost:4000", { timeout: 1000 });

Promise.reject(new Error("anything"));

logger.log("Something");
