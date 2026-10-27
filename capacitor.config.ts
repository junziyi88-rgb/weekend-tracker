import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.youxue.weekendtracker",
  appName: "周末干了啥？",
  webDir: "dist",
  android: {
    buildOptions: {
      keystorePath: "release-key.jks",
      keystoreAlias: "weekend-tracker",
    },
  },
};

export default config;
