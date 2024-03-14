import { format } from "winston";
import { LogVaultMaskFieldsOptions } from "../types";
import { MESSAGE } from "..";
import { map } from "obj-walker";
import { defaultMaskFieldsOptions } from "../defaults";

export const formatMaskFields = format(
  (info, opts: LogVaultMaskFieldsOptions) => {
    const { message, extra, error } = info;
    const { fields, maskLabel } = opts;

    if (fields?.length) {
      if (message) {
        mask(message);
        info[MESSAGE] = message;
      }
      if (extra) mask(extra);
      if (error) mask(error);
    }

    return info;

    function mask(data: object) {
      return map(
        data,
        ({ key, val }) => {
          if (key && fields.includes(key))
            val = maskLabel || defaultMaskFieldsOptions.maskLabel;
          if (typeof val === "string") {
            try {
              const parsed = JSON.parse(val);
              val = JSON.stringify(mask(parsed));
              // eslint-disable-next-line no-empty
            } catch (error) {}
          }
          return val;
        },
        { modifyInPlace: true }
      );
    }
  }
);
