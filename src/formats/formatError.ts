import { serializeError } from "@common.js/serialize-error";
import { AxiosError } from "axios";
import { format } from "winston";

export const formatError = format((info) => {
  const { error } = info;

  let formattedError: any = error;

  if (error) {
    if (error instanceof AxiosError) {
      formattedError = error.toJSON();
      if (error.response) {
        formattedError.response = {
          headers: error.response.headers,
          data: error.response.data
        };
      }
    }
  }
  info.error = serializeError(formattedError);

  return info;
});
