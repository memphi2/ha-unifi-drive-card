import "./editor";
import "./unifi-drive-card";
import { unifiDriveCardRegistration, type CustomCardRegistration } from "./card-picker";

declare global {
  interface Window {
    customCards?: CustomCardRegistration[];
  }
}

window.customCards = window.customCards ?? [];
window.customCards.push(unifiDriveCardRegistration);
