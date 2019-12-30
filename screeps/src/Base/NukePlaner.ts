import { Colony } from 'Colony'
import { resourceRequest } from "Base/ResourceHandler"

export function NukeResourceReq(colony: Colony): void {
  let nuker = colony.nuker;
  if (nuker) {
    if (nuker.store.G < 5000 && colony.resourceHandler.getReq(nuker.id, RESOURCE_GHODIUM) == null) {
      if (colony.room.terminal && colony.room.terminal.store.G < 5000 - nuker.store.G) {
        let found = colony.resourceExternal.find(value => value == RESOURCE_GHODIUM);
        console.log(colony.name, "try to add external", colony.resourceExternal, found);
        if (!found) {
          colony.resourceExternal.push(RESOURCE_GHODIUM);
          console.log(colony.name, "added external resource req");
        }
      }

      colony.resourceHandler.addRequest(new resourceRequest(nuker.id, RESOURCE_GHODIUM, 4999, 5000, nuker.room));
      console.log(colony.name, "added nuker Ghodium resource req")
    }
  }
}
