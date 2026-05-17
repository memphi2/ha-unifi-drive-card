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
  name: "UniFi Drive Card",
  description: "Mushroom-style card for the UniFi Drive / UNAS integration",
  preview: true,
});
