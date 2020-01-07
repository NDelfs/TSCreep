import { Colony } from "Colony";
import { resourceRequest } from "Base/Handlers/ResourceHandler";

export function sendEnergy(colony: Colony, link: StructureLink) {
  if (link.energy >= 400 && link.cooldown == 0) {
    let conLink = colony.controllerLink;
    if (conLink && conLink.energy <= 400) {
      link.transferEnergy(conLink);
      return;
    }
    let baseLink = colony.baseLink;
    if (baseLink && baseLink.energy <= 600) {
      link.transferEnergy(baseLink);
      if (!colony.resourceHandler.resourcePush[baseLink.id]) {
        colony.resourceHandler.resourcePush[baseLink.id] = new resourceRequest(baseLink.id, RESOURCE_ENERGY, 200, 0, baseLink.room);
      }
    }
  }
}
