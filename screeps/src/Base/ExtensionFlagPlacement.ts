import { restorePos, storePos, isBuildable } from "utils/posHelpers";
import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { isFlagColor, FLAG_EXTENSION_BUILD } from "../Types/FlagTypes";


function getMaxCap(level: number): number {
  switch (level) {
    case 0: return 0;
    case 1: return 0;
    case 2: return 5;
    case 3: return 10;
    case 4: return 20;
    case 5: return 30;
    case 6: return 40;
    case 7: return 50;
    case 8: return 60;
  }
  return 0;
}

function buildAt(x: number, y: number, room: string): number {
  const tmpPos = new RoomPosition(x, y, room);
  const err = isBuildable(tmpPos)
  if (err == 2) {
    const err = tmpPos.createConstructionSite(STRUCTURE_EXTENSION);
    if (err == OK) {
      return 1;
    }
    if (err == ERR_FULL)
      throw ("Cant expand due too to many constructions")
    if (err == ERR_RCL_NOT_ENOUGH)
      throw ("The extension calculation was wrong in ExtensionFlag")
    console.log("Built at location with warning", tmpPos, PrettyPrintErr(err));
  }
  else if (err == 0)
    return 0;
  return 10;
}

export function ExtensionFlagPlacement(room: Room) {
  let buildFlag = _.first(room.find(FIND_FLAGS, { filter: function (flag) { return isFlagColor(flag, FLAG_EXTENSION_BUILD) } }));
  let xDir: number;
  let yDir: number;

  if (buildFlag) {
    let pos = restorePos(storePos(buildFlag.pos));
    let inQue = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION } }).length;
    const nrBuilt = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTENSION } }).length;
    const contr = Game.rooms[pos.roomName].controller;
    if (contr && getMaxCap(contr.level) > nrBuilt + inQue) {
      pos.createConstructionSite(STRUCTURE_ROAD);
      const dirS = buildFlag.name.substr(0, 2);
      if (dirS == 'SE') {
        xDir = 1;
        yDir = 1;
      } else if (dirS == 'NW') {
        xDir = -1;
        yDir = -1;
        let success = 0;
        success += Number(buildAt(pos.x - 1, pos.y + 1, pos.roomName));
        success += Number(buildAt(pos.x + 1, pos.y - 1, pos.roomName));
        inQue += success % 10;
        pos.x = pos.x + xDir;//to make it start at correct spot
        pos.y = pos.y + yDir;
      }
      else throw ("Not supported direction for flag extension");


      for (let i = 0; i < 6; i++) {
        if (isBuildable(pos)) {
          pos.createConstructionSite(STRUCTURE_ROAD);
          console.log("Try to expand at ", pos);
          let success = 0;
          success += Number(buildAt(pos.x - 1, pos.y + 1, pos.roomName));
          success += Number(buildAt(pos.x, pos.y + 1, pos.roomName));
          success += Number(buildAt(pos.x + 1, pos.y - 1, pos.roomName));
          success += Number(buildAt(pos.x + 1, pos.y, pos.roomName));
          if (success == 0)
            break;
          inQue += success % 10;
          if (getMaxCap(contr.level) <= nrBuilt + inQue) {
            console.log("cant extend more used all avail extension ", pos);
            return;
          }

          pos.x = pos.x + xDir;
          pos.y = pos.y + yDir;
        }
        else {
          console.log("cant extend more, not buildable ", pos);
          break;
        }
      }
      console.log("flag change color, finished expansion", buildFlag.name);
      buildFlag.setColor(COLOR_RED, COLOR_GREEN);
    }
  }
}
