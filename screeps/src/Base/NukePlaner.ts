import { Colony, resourceRequest} from 'Colony'

export function NukeResourceReq(colony: Colony): void {
  let nuker = colony.nuker;
  if (nuker) {
    if (nuker.store.G < 5000 && colony.resourceRequests[nuker.id] == null) {
      if (colony.room.terminal && colony.room.terminal.store.G < 5000 - nuker.store.G) {
        let found = colony.resourceExternal.find(value => value == RESOURCE_GHODIUM);
        console.log(colony.name, "try to add external", colony.resourceExternal, found);
        if (!found) {
          colony.resourceExternal.push(RESOURCE_GHODIUM);
          console.log(colony.name, "added external resource req");
        }
      }

      colony.resourceRequests[nuker.id] = new resourceRequest(nuker.id, RESOURCE_GHODIUM, 4999, 5000, nuker.room);
      console.log(colony.name, "added nuker Ghodium resource req")
    }
  }
}
