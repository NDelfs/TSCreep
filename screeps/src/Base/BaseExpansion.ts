import { ExtensionFlagPlacement } from "./ExtensionFlagPlacement";
import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";
import { restorePos, storePos, isBuildable } from "utils/posHelpers";

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
                            for (let sourceID of room.memory.sourcesUsed) {
                                let goal = restorePos(Memory.Sources[sourceID].workPos);
                                buildRoad(goal, sStoreP, 5);
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
                    else if (room.memory.ExpandedLevel == 5 && room.storage) {
                        let link = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });
                        let linkcons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_LINK } });
                        if (link.length + linkcons.length < 3) {
                            let pos = spawns[0].pos; //for the 7 one
                            pos.y += 2;
                            let obj: Structure[] = pos.lookFor(LOOK_STRUCTURES);
                            if (obj.length > 0 && obj[0].structureType != STRUCTURE_ROAD)
                                console.log("something else is built on link main spot", pos.x, pos.y, pos.roomName);
                            else {
                                let err = pos.createConstructionSite(STRUCTURE_LINK);
                                buildPrint(err, "linkMain ", room.name);
                            }
                            //put close to harvesters
                            for (let sourceID of room.memory.sourcesUsed) {
                                let source = Memory.Sources[sourceID];
                                let err2 = findAndBuildLink(restorePos(source.workPos));
                                buildPrint(err2, "link", room.name);
                            }
                        }
                        for (let sourceID of room.memory.mineralsUsed) {
                            let goal = restorePos(Memory.Minerals[sourceID].workPos);
                            restorePos(Memory.Minerals[sourceID].pos).createConstructionSite(STRUCTURE_EXTRACTOR);
                            let sStoreP = room.storage.pos;
                            buildRoad(goal, sStoreP, 5);
                        }

                        if (link.length == 3) {
                            for (let sourceID of room.memory.sourcesUsed) {
                                let source = Memory.Sources[sourceID];
                                let pos = restorePos(source.workPos);
                                let structures: StructureLink[] = pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: { structuceType: STRUCTURE_LINK } }) as StructureLink[];
                                if (structures.length > 0) {
                                    source.linkID = structures[0].id;
                                }
                            }
                            room.memory.ExpandedLevel = 6
                        }
                    } if (room.memory.ExpandedLevel == 6 && room.storage) {

                    }
                } 
            }
            catch (e) {
                console.log("base expansion failed with", e);
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
            console.log("in build link loog",xd,yd);
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
