import { format } from "winston";
import { LogVaultMaskFieldsOptions } from "../types";
import { MESSAGE } from "..";
import { map } from "obj-walker";
import { defaultMaskFieldsOptions } from "../defaults";

export const formatMaskFields = format(
  (info, opts: LogVaultMaskFieldsOptions) => {
    const { message, extra, error } = info;
    const { fields, maskLabel, replacers } = opts;

    if (fields?.length) {
      if (message) {
        info.message = mask(message)
        info[MESSAGE] = info.message;
      }
      if (extra) info.extra = mask(extra);
      if (error) info.error = mask(error);
    }

    return info;

    function mask(data: object | string) {
      if(typeof data === 'string') {
        return maskString(data)}
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
            val = maskString(val)
          }
          return val;
        },
        { modifyInPlace: true }
      );
    }

    function maskString(val: string) {
      replacers?.forEach(([regExp, cb]) => {
        val = val.replace(regExp, cb);
      });
      return val
    }
  }
);
