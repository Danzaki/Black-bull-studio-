export interface AISettings {
  quality: "standard" | "hd";
  outputFormat: "png" | "jpeg";
  safeMode: boolean;
}

export const defaultSettings: AISettings = {
  quality: "hd",
  outputFormat: "png",
  safeMode: true,
};
