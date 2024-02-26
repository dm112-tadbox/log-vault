import { LogVaultMaskFieldsOptions } from "../types";

export const defaultMaskFieldsOptions: LogVaultMaskFieldsOptions = {
  maskLabel: "...[Masked]",
  fields: ["password", "token", "otp", "secret"]
};
