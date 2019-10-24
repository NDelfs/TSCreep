import { ExtensionFlagPlacement } from "./ExtensionFlagPlacement";

export function baseExpansion() {
    for (let [id, room] of Object.entries(Game.rooms)) {
        try {
            ExtensionFlagPlacement(room);
        }
        catch (e) {
            console.log("flag expansion failed in ", room.name, " with ", e);
        }
    }

}
