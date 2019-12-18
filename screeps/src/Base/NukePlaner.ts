import { Colony, resourceRequest} from 'Colony'

export function NukeResourceReq(colony: Colony): void {
  let nuker = colony.nuker;
  if (nuker) {
    if (nuker.store.energy < 3e5 && colony.resourceRequests[nuker.id] == null) {
      colony.resourceRequests[nuker.id] = new resourceRequest(nuker.id, RESOURCE_ENERGY, 3e5, 3e5, nuker.room);
      console.log(colony.name,"added nuker energy resource req")
    }
    if (nuker.store.G < 5000 && colony.resourceRequests[nuker.id] == null) {
      colony.resourceRequests[nuker.id] = new resourceRequest(nuker.id, RESOURCE_GHODIUM, 5000, 5000, nuker.room);
      console.log(colony.name, "added nuker Ghodium resource req")
    }
  }
}
