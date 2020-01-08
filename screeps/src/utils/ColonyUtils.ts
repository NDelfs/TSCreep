import { Colony } from "Colony";

export function findClosestColonies(colonies: { [name: string]: Colony }, targetRoom : string, maxNr : number): Colony[] {
  let dists: { name: string, dist: number }[] = [];
  for (let colName in colonies) {

    let col = colonies[colName];
    if (colName != targetRoom && col.controller.level >= 3) {
      dists.push({ name: col.name, dist: Game.map.getRoomLinearDistance(col.name, targetRoom) - col.controller.level });//balance in the controller level
    }
  }
  dists.sort((a, b) => { return a.dist - b.dist });
  console.log("Find closest got first as", JSON.stringify(dists[0]), JSON.stringify(_.last(dists)));

  let closest: { name: string, dist: number }[] = [/*{ name: "", dist: 999 }*/];
  for (let dist of dists) {
    if (closest.length >= maxNr && dist.dist > closest[maxNr-1].dist)
      break;//abort early if linear is more expensive than closest real Path
    let colony = colonies[dist.name];
    let route = Game.map.findRoute(colony.name, targetRoom, {
      routeCallback(roomName) {
        let room = Game.rooms[roomName];
        let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName)!;
        let isHighway = (parseInt(parsed[1]) % 10 === 0) || (parseInt(parsed[2]) % 10 === 0);
        // let isMyRoom = room && room.controller && room.controller.my;
        if (isHighway) {
          return 1;
        } else {
          return 2;
        }
      }
    })

    //updade dist and closest
    if (route != -2) {
      console.log("find closest real dist to room =", route.length, dist.name, "col level", colonies[dist.name].controller.level);
      dist.dist = route.length - colonies[dist.name].controller.level;//balance in the controller level
      if (closest.length <= maxNr || dist.dist < closest[maxNr-1].dist) {
        closest.push(dist);
        closest.sort((a, b) => { return a.dist - b.dist });
      }
    }
    else {
      dist.dist = 999;
    }
  }
  if (closest.length != 0) {
    return closest.map((clo) => {
      console.log("found new closest", clo.name);
      return colonies[clo.name];
    });
  }
  else {
    throw "Can not find path to room" + targetRoom;
  }
}


export function findClosestColony(colonies: { [name: string]: Colony }, targetRoom: string): Colony | null {
  let cols = findClosestColonies(colonies, targetRoom, 1);
  if (cols.length >= 1)
    return cols[0];
  else
    return null;
}
