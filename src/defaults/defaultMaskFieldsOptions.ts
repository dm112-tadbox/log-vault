import { LogVaultMaskFieldsOptions } from "../types";

const defaultMaskLabel = "...[Masked]"

export const defaultMaskFieldsOptions: LogVaultMaskFieldsOptions = {
  maskLabel: defaultMaskLabel,
  fields: ["password", "token", "otp", "secret"],
  replacers: [
    [
      /\b([a-z][a-z0-9+\-.]*:\/\/)([^:@\s]+):([^@\s]+)(@)/gi,
      (_match, protocol, user, _password, at) => {
        return `${protocol}${defaultMaskLabel}:${defaultMaskLabel}${at}`;
      }
    ]
  ]
};