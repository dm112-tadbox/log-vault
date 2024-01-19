export enum TextColor {
  black = "black",
  red = "red",
  green = "green",
  yellow = "yellow",
  blue = "blue",
  magenta = "magenta",
  cyan = "cyan",
  white = "white",
  gray = "gray"
}

export interface ColorsConstructor {
  error: TextColor;
  warn: TextColor;
  info: TextColor;
  http: TextColor;
  verbose: TextColor;
  debug: TextColor;
  silly: TextColor;
}

export enum BgColor {
  blackBG = "blackBG",
  redBG = "redBG",
  greenBG = "greenBG",
  yellowBG = "yellowBG",
  blueBG = "blueBG",
  magentaBG = "magentaBG",
  cyanBG = "cyanBG",
  whiteBG = "whiteBG"
}
