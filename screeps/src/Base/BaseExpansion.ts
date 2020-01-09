import { ExtensionFlagPlacement } from "./ExtensionFlagPlacement";
import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { restorePos, storePos, isBuildable, isEqualPos } from "utils/posHelpers";
import { Colony } from "Colony"
import { isFlagColor, FLAG_LABS } from "../Types/FlagTypes";

function buildRoad(startPos: RoomPosition, goalPos: RoomPosition, iRange: number) {
  let goal = { pos: goalPos, range: iRange };
  let options: PathFinderOpts = {
    // We still want to avoid some swamp purely out of upkeep cost
    plainCost: 1,
    swampCost: 3,
    //here we only add avodance to building that we cant pass
    roomCallback: function (roomName: string) {
      let room = Game.rooms[roomName];
      // In this example `room` will always exist, but since 
      // PathFinder supports searches which span multiple rooms 
      // you should be careful!
      if (!room) return false;
      let costs = new PathFinder.CostMatrix;

      room.find(FIND_STRUCTURES).forEach(function (struct) {
        if (struct.structureType !== STRUCTURE_CONTAINER && struct.structureType !== STRUCTURE_ROAD &&
          (struct.structureType !== STRUCTURE_RAMPART ||
            !struct.my)) {
          // Can't walk through non-walkable buildings
          costs.set(struct.pos.x, struct.pos.y, 0xff);
        }
      });
      return costs;
    },
  }

  let pathObj = PathFinder.search(startPos, goal, options);
  for (let pos of pathObj.path) {
    pos.createConstructionSite(STRUCTURE_ROAD);
  }
}

function buildPrint(err: number, type: string, room: string) {
  if (err == OK) {
    console.log("built", type, "in ", room);
  }
  else {
    console.log("failed to build", type, "in", room, PrettyPrintErr(err));
  }
}

function getIdInRange(pos: RoomPosition, range: number, type: StructureConstant): string | null{
  let con = pos.findInRange(FIND_STRUCTURES, range, { filter: { structureType: type } });
  if (con.length > 0 && con[0].isActive()) {
    return con[0].id;
  }
  return null;
}

function buildControlerStruct(colony: Colony, type: BuildableStructureConstant, pathInd : number, memory : string|null) : string | null {//path ind is starting from zero and zero is end of path before Controler
  if (memory == null) {
    memory = getIdInRange(colony.controller.pos, pathInd+1, type);
    if (memory == null) {
      let con = colony.controller.pos.findInRange(FIND_CONSTRUCTION_SITES, pathInd + 1, { filter: { structureType: type } });
      if (con.length == 0) {
        let goal = { pos: colony.spawns[0].pos, range: 1 };
        let pathObj = PathFinder.search(colony.controller.pos, goal);//ignore object need something better later. cant use for desirialize
        if (pathObj.path.length < 2)
          throw ("Could not place controller stuff due to short distance");
        pathObj.path[pathInd].createConstructionSite(type);
        console.log(colony.name, "built controller",type);
      }
    }
  }
  return memory;//due to string overvriting the reference with a new object
}

function buildSourceLink(colony: Colony, memory: SourceMemory) {
  if (memory.linkID == null) {
    let workPos = restorePos(memory.workPos);
    memory.linkID = getIdInRange(workPos, 1, STRUCTURE_LINK);
    if (memory.linkID==null) {
      let con = workPos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: { structureType: STRUCTURE_LINK } });
      if (con.length == 0) {
        findAndBuildLink(workPos);
        console.log(colony.name, "built source link");
      }
    }
  }
}

function buildSourceCon(colony: Colony, memory: SourceMemory) {
  if (memory.container == null) {
    let workPos = restorePos(memory.workPos);
    memory.container = getIdInRange(workPos, 1, STRUCTURE_CONTAINER);
    if (memory.container)
      console.log(colony.name, "found source container");
  }
}

function buildBaseLink(colony: Colony) {
  if (colony.baseLink == null && colony.room.storage) {
    let pos = colony.room.storage.pos;
    colony.memory.baseLinkID = getIdInRange(pos, 1, STRUCTURE_LINK);
    if (colony.memory.baseLinkID == null) {
      console.log(colony.name, "could not find base link");
    }
  }
}

function buildStructAt(colony: Colony, pos: RoomPosition, type: BuildableStructureConstant) {
  
  implement such that we can get the towers
}

function buildSpawns(colony: Colony, pos: RoomPosition) {
  let found = false;
  let roomSpawns = colony.room.find(FIND_MY_SPAWNS);
  if (roomSpawns.length != colony.spawns.length) {
    colony.spawns = roomSpawns;
  }

  for (let spawn of colony.spawns) {
    found = found || isEqualPos(spawn.pos, pos);
  }
  if (!found) {
    let spawnscons = colony.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_SPAWN } });
    if (spawnscons.length == 0) {
      let err = pos.createConstructionSite(STRUCTURE_SPAWN);
      buildPrint(err, "spawn", colony.name);
    }
  }
}


export function baseExpansion(colony: Colony) {
  if (Game.time % 10 != 1)
    return;
  let cRoom = colony.room;

  try {
    ExtensionFlagPlacement(colony.room);
  }
  catch (e) {
    console.log("flag expansion failed in ", colony.name, " with ", e);
  }

  try {
    //we have some stuff that should be verified and rebuilt if destroyed
    if (colony.controller.my) {
      if (colony.memory.startSpawnPos) {
        buildSpawns(colony, restorePos(colony.memory.startSpawnPos));
      }
    }
    if (colony.controller.level >= 2) {
      colony.memory.controllerStoreID = buildControlerStruct(colony, STRUCTURE_CONTAINER, 1, colony.memory.controllerStoreID);
    }
    let sources = colony.room.find(FIND_SOURCES);
    if (colony.controller.level >= 3) {
      for (let source of sources)
        buildSourceCon(colony, source.memory);
    }
    if (colony.controller.level >= 5) {
      colony.memory.controllerLinkID = buildControlerStruct(colony, STRUCTURE_LINK, 0, colony.memory.controllerLinkID);
      if (sources.length > 0)
        buildSourceLink(colony, sources[0].memory)
    }
    if (colony.controller.level >= 6) {
      if (sources.length > 1)
        buildSourceLink(colony, sources[1].memory)
      if (colony.memory.mineralsUsed.length >= 1)
        buildSourceCon(colony, Memory.Resources[colony.memory.mineralsUsed[0]]);
    }


    if (colony.memory.colonyType == 2) {
      baseExpansionV2(colony);
      return;
    }
    else {
      if (colony.controller.level >= 7) {
        buildBaseLink(colony);
      }

      if (colony.controller.level > colony.memory.ExpandedLevel) {
        let buildFlag = cRoom.find(FIND_FLAGS, { filter: function (flag) { return flag.color == COLOR_RED } });

        if (colony.memory.ExpandedLevel == 0) {
          if (colony.spawns.length > 0)
            colony.memory.ExpandedLevel = 2;
        }
        else if (colony.memory.ExpandedLevel == 2) {
          let towers = cRoom.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
          let towercons = cRoom.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
          if (towers.length == 0 && towercons.length == 0) {
            let pos = colony.spawns[0].pos;
            pos.x += 1;
            pos.y += 5;
            let err = pos.createConstructionSite(STRUCTURE_TOWER);
            if (err == OK) {
              console.log("built Tower in ", colony.name);
              let flags = cRoom.find(FIND_FLAGS, { filter: { color: COLOR_WHITE } });
              if (flags.length > 0)
                flags[0].remove();
            }
            else {
              console.log("failed to build Tower in ", colony.name, PrettyPrintErr(err));
              return;
            }
          }
          colony.memory.ExpandedLevel = 3;
        } else if (colony.memory.ExpandedLevel == 3) {
          let storagecons = cRoom.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_STORAGE } });
          if (cRoom.storage == null && storagecons.length == 0) {
            let pos = colony.spawns[0].pos;
            pos.x += 0;
            pos.y += 3;
            let err = pos.createConstructionSite(STRUCTURE_STORAGE);
            buildPrint(err, "storage", colony.name);
          }
          if (cRoom.storage) {
            let sStoreP = cRoom.storage.pos;
            for (let sourceID of colony.memory.sourcesUsed) {
              let goal = restorePos(Memory.Resources[sourceID].workPos);
              buildRoad(goal, sStoreP, 5);
              goal.createConstructionSite(STRUCTURE_CONTAINER);
            }
            for (let flag of buildFlag) {
              buildRoad(flag.pos, sStoreP, 5);
            }
            //base roads
            (new RoomPosition(sStoreP.x, sStoreP.y + 2, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//3
            (new RoomPosition(sStoreP.x - 1, sStoreP.y + 1, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//2
            (new RoomPosition(sStoreP.x + 1, sStoreP.y + 1, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//2
            (new RoomPosition(sStoreP.x - 1, sStoreP.y + 0, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//1
            (new RoomPosition(sStoreP.x + 1, sStoreP.y + 0, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//1
            (new RoomPosition(sStoreP.x - 1, sStoreP.y - 1, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//0
            (new RoomPosition(sStoreP.x + 1, sStoreP.y - 1, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//0
            (new RoomPosition(sStoreP.x, sStoreP.y - 2, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//-1
            (new RoomPosition(sStoreP.x - 1, sStoreP.y - 3, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//-2
            (new RoomPosition(sStoreP.x + 1, sStoreP.y - 3, sStoreP.roomName)).createConstructionSite(STRUCTURE_ROAD);//-2
            //-3
            colony.memory.ExpandedLevel = 4;
          }
        } else if (colony.memory.ExpandedLevel == 4) {
          let towers = cRoom.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
          let towercons = cRoom.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
          if (towers.length == 1 && towercons.length == 0) {
            let pos = colony.spawns[0].pos;
            pos.x -= 1;
            pos.y += 5;
            let err = pos.createConstructionSite(STRUCTURE_TOWER);
            buildPrint(err, "tower", colony.name);
          }
          colony.memory.ExpandedLevel = 5;
        }
        else if (colony.memory.ExpandedLevel == 5 && cRoom.storage) {
          for (let sourceID of colony.memory.mineralsUsed) {
            if (restorePos(Memory.Resources[sourceID].pos).lookFor(LOOK_CONSTRUCTION_SITES).length == 0) {
              let goal = restorePos(Memory.Resources[sourceID].workPos);
              restorePos(Memory.Resources[sourceID].pos).createConstructionSite(STRUCTURE_EXTRACTOR);
              let sStoreP = cRoom.storage.pos;
              buildRoad(goal, sStoreP, 5);
            }
          }
          colony.memory.ExpandedLevel = 6
        } if (colony.memory.ExpandedLevel == 6 && cRoom.storage) {

        }
      }
    }
  }
  catch (e) {
    console.log("base expansion failed with", e);
  }



}


export function findAndBuildLab(col: Colony, labs: StructureLab[]) {
  let room = col.room;
  let level = room.controller!.level - 5;
  let maxLab = (level * 3 + Number(level == 3));
  if (labs.length < maxLab) {
    let buildFlag = room.find(FIND_FLAGS, { filter: function (flag) { return isFlagColor(flag, FLAG_LABS); } });
    if (buildFlag.length == 1) {
      let positions: { x: number; y: number }[] = [{ x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: -1 }, { x: 1, y: 0 },
      { x: 0, y: -2 }, { x: 1, y: -1 }, { x: 2, y: 0 },
      { x: 1, y: -2 }, { x: 2, y: -1 }];

      let fPos = buildFlag[0].pos;
      for (let i = labs.length; i < maxLab; i++) {
        let pos = new RoomPosition(fPos.x + positions[i].x, fPos.y + positions[i].y, fPos.roomName);
        //console.log(i, pos.x, pos.y)
        let structs = pos.lookFor(LOOK_STRUCTURES);
        for (let struct of structs) {
          if (struct.structureType == STRUCTURE_LAB) {
            labs.push(struct as StructureLab);
            col.memory.labMemories.push({ ID: struct.id, state: null, pushedStat: null, resource: "" });
          }
        }
        if (labs.length < i + 1) {
          pos.createConstructionSite(STRUCTURE_LAB);
        }
      }
    }
  }
}



function findAndBuildLink(workPos: RoomPosition): number {
  console.log("in build link");
  for (let xd = -1; xd <= 1; xd++) {
    for (let yd = -1; yd <= 1; yd++) {
      if (xd == 0 && yd == 0)
        continue;
      console.log("in build link loog", xd, yd);
      let pos = new RoomPosition(workPos.x + xd, workPos.y + yd, workPos.roomName);
      console.log("before is buildable", pos.x, pos.y);
      if (isBuildable(pos)) {
        console.log("is buildable", pos.x, pos.y);
        let err = pos.createConstructionSite(STRUCTURE_LINK);
        if (err != OK)
          continue
        return OK;
      }
    }
  }
  return ERR_INVALID_TARGET;
}



function baseExpansionV2(colony: Colony){
  if (colony.controller.level >= 7) {
    buildBaseLink(colony);
  }
}
