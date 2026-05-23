import "./editor";
import "./unifi-drive-card";

declare global {
  interface Window {
    customCards?: Array<Record<string, string | boolean>>;
  }
}

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "unifi-drive-card",
  name: "Drive Storage Card",
  description: "Mushroom-style card for Home Assistant's unifi_unas integration",
  preview: true,
});
