import { Colony } from "Colony";
import { restorePos } from "./posHelpers";

export function findClosestColonies(colonies: { [name: string]: Colony }, targetRoom: string, maxNr: number): Colony[] {
  let maxLvl = 3+1;// min we at all want to find +2 because we want to look for lower levels later
  for (let colName in colonies) {
    maxLvl = Math.max(colonies[colName].controller.level, maxLvl);
  }

  let dists: { name: string, dist: number }[] = [];
  for (let colName in colonies) {
    let col = colonies[colName];
    if (colName != targetRoom && col.controller.level >= maxLvl-1) {
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


export function findPathToSource(colony: Colony, sourcePos: RoomPosition, maxOps?:number) {
  let goal = { pos: sourcePos, range: 1 };
  let start: RoomPosition = restorePos(colony.memory.startSpawnPos!);
  if (colony.room.storage)
    start = colony.room.storage.pos;
  let options: PathFinderOpts = {
    // We still want to avoid some swamp purely out of upkeep cost
    plainCost: 2,
    swampCost: 10,
    maxOps: maxOps || 10000,
    //here we only add avodance to building that we cant pass
    roomCallback: function (roomName: string) {
      let room = Game.rooms[roomName];
      // In this example `room` will always exist, but since 
      // PathFinder supports searches which span multiple rooms 
      // you should be careful!
      
      let costs = new PathFinder.CostMatrix;

      if (!room) {
        console.log("PathPlaning is planning in a room withouth visability", roomName);
        return costs;
      }

      room.find(FIND_STRUCTURES).forEach(function (struct) {
        if (struct.structureType == STRUCTURE_ROAD && costs.get(struct.pos.x, struct.pos.y) != 0xff) {
          costs.set(struct.pos.x, struct.pos.y, 1);
        }
        else if (/*struct.structureType !== STRUCTURE_CONTAINER && */(struct.structureType !== STRUCTURE_RAMPART || !struct.my)) {
          // Can't walk through non-walkable buildings
          costs.set(struct.pos.x, struct.pos.y, 0xff);
        }
      });
      return costs;
    },
  }

  return PathFinder.search(start, goal, options);//ignore object need something better later. cant use for desirialize
}

export function serializePath(path: RoomPosition[]) {
  let retString = String(path[0].x).padStart(2, '0') + String(path[0].y).padStart(2, '0');
  for (let i = 0; i < path.length - 1; i++) {
    retString += getDirection(path[i], path[i + 1]);
  }
  return retString;
}

export function getDirection(p1: RoomPosition | posData, p2: RoomPosition | posData): number {

  let yDir = p2.y - p1.y;
  let xDir = p2.x - p1.x;
  //if (xDir == 0)
  //  ret = 3 + yDir * 2;
  //else
  //  ret = (5 - xDir * 2) + xDir * yDir;
  let ret = 5 + xDir * (yDir - 2);//x not zero
  let ret2 = ret + (1 - yDir) * (xDir * xDir - 1) * 2;//if x zero this add value
  let res = +(p1.roomName == p2.roomName) * ret2;
  return res;

}
