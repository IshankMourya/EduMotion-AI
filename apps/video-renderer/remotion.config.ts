import { Config } from "@remotion/cli/config";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { existsSync } from "fs";
import { mkdirSync } from "fs";

Config.OutputLocation = "out";

export const remotionConfig = {
  enableCommandLine: true,
};