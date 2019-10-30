import { ExtensionFlagPlacement } from "./ExtensionFlagPlacement";
import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";
import { restorePos } from "../utils/posHelpers";

function buildRoad(startPos: RoomPosition, goalPos: RoomPosition, iRange:number) {
    let goal = { pos: goalPos, range: iRange };
    let options: PathFinderOpts = {
        // We still want to avoid some swamp purely out of upkeep cost
        plainCost: 1,
        swampCost: 3,
        //here we only add avodance to building that we cant pass
        roomCallback: function (roomName : string) {
            let room = Game.rooms[roomName];
            // In this example `room` will always exist, but since 
            // PathFinder supports searches which span multiple rooms 
            // you should be careful!
            if (!room) return false;
            let costs = new PathFinder.CostMatrix;

            room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType !== STRUCTURE_CONTAINER &&
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

function buildPrint(err: number, type : string, room : string) {
    if (err == OK) {
        console.log("built", type , "in " , room);
    }
    else {
        console.log("failed to build", type, "in", room, PrettyPrintErr(err));
        throw ("build fail");
    }
}

export function baseExpansion() {
    for (let [id, room] of Object.entries(Game.rooms)) {
        if (room.controller && room.controller.my && room.controller.level > 0) {
            try {
                ExtensionFlagPlacement(room);
            }
            catch (e) {
                console.log("flag expansion failed in ", room.name, " with ", e);
            }
            try {
                if (room.controller.level > room.memory.ExpandedLevel) {
                    let buildFlag = room.find(FIND_FLAGS, { filter: function (flag) { return flag.color == COLOR_RED } });
                    let spawns = room.find(FIND_MY_SPAWNS);
                    if (room.memory.ExpandedLevel == 0) {
                        if (spawns.length == 0) {
                            let spawnscons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_SPAWN } });
                            if (spawnscons.length == 0) {
                                let flags = room.find(FIND_FLAGS, { filter: { color: COLOR_WHITE } });
                                if (flags.length > 0) {
                                    let middle = flags[0].pos;
                                    middle.y += -2;
                                    let err = middle.createConstructionSite(STRUCTURE_SPAWN);
                                    buildPrint(err, "spawn", room.name);
                                }
                            }
                        }
                        room.memory.ExpandedLevel = 2;

                    }
                    else if (room.memory.ExpandedLevel == 2) {
                        let towers = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
                        let towercons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
                        if (towers.length == 0 && towercons.length == 0) {
                            let pos = spawns[0].pos;
                            pos.x += 1;
                            pos.y += 5;
                            let err = pos.createConstructionSite(STRUCTURE_TOWER);
                            if (err == OK) {
                                console.log("built Tower in ", room.name);
                                let flags = room.find(FIND_FLAGS, { filter: { color: COLOR_WHITE } });
                                if (flags.length > 0)
                                    flags[0].remove();
                            }
                            else {
                                console.log("failed to build Tower in ", room.name, PrettyPrintErr(err));
                                return;
                            }
                        }
                        let goal = { pos: spawns[0].pos, range: 1 };
                        let pathObj = PathFinder.search(room.controller.pos, goal);//ignore object need something better later. cant use for desirialize
                        if (pathObj.path.length < 2)
                            throw ("Could not place controller stuff due to short distance");
                        pathObj.path[1].createConstructionSite(STRUCTURE_CONTAINER);
                        room.memory.controllerStoreDef = CONSTRUCTIONSTORAGE;

                        room.memory.ExpandedLevel = 3;
                    } else if (room.memory.ExpandedLevel == 3) {
                        let storagecons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_STORAGE } });
                        if (room.storage == null && storagecons.length == 0) {
                            let pos = spawns[0].pos;
                            pos.x += 0;
                            pos.y += 3;
                            let err = pos.createConstructionSite(STRUCTURE_STORAGE);
                            buildPrint(err, "storage", room.name);
                        }
                        if (room.storage) {
                            let sStoreP = room.storage.pos;
                            sStoreP.y += -2;
                            for (let sourceID of room.memory.sourcesUsed) {
                                let goal = restorePos(Memory.Sources[sourceID].workPos);
                                buildRoad(sStoreP, goal, 0);
                            }
                            for (let flag of buildFlag) {
                                buildRoad(sStoreP, flag.pos, 0);
                            }
                            room.memory.ExpandedLevel = 4;
                        }
                    } else if (room.memory.ExpandedLevel == 4) {
                        let towers = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
                        let towercons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
                        if (towers.length == 1 && towercons.length == 0) {
                            let pos = spawns[0].pos;
                            pos.x -= 1;
                            pos.y += 5;
                            let err = pos.createConstructionSite(STRUCTURE_TOWER);
                            buildPrint(err, "tower", room.name);
                        }
                        room.memory.ExpandedLevel = 5;
                    }
                    //else if (room.memory.ExpandedLevel == 5) {
                    //    let link = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });
                    //    let linkcons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_LINK } });
                    //    if (link.length + linkcons.length < 3) {
                    //        let pos = spawns[0].pos; //for the 7 one
                    //        pos.y += 2;
                    //        let err = pos.createConstructionSite(STRUCTURE_LINK);
                    //        buildPrint(err, "link", room.name);
                    //        //put close to harvesters
                    //    }
                    //}
                } 
            }
            catch (e) {

            }
        }
    }

}
