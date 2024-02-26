import { format } from "winston";
import { LogVaultMaskFieldsOptions } from "../types";
import { MESSAGE } from "..";
import { map } from "obj-walker";
import { defaultMaskFieldsOptions } from "../defaults";

export const formatMaskFields = format(
  (info, opts: LogVaultMaskFieldsOptions) => {
    const { message } = info;
    const { fields, maskLabel } = opts;

    if (fields?.length && message) {
      const maskedMessage = message;
      map(
        maskedMessage,
        ({ key, val }) => {
          if (key && typeof val === "string" && fields.includes(key))
            val = maskLabel || defaultMaskFieldsOptions.maskLabel;
          return val;
        },
        { modifyInPlace: true }
      );
      info.message = maskedMessage;
      info[MESSAGE] = maskedMessage;
    }

    return info;
  }
);
