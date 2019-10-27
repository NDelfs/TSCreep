import { ExtensionFlagPlacement } from "./ExtensionFlagPlacement";
import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";

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
                    let spawns = room.find(FIND_MY_SPAWNS);
                    if (room.memory.ExpandedLevel == 0) {
                        if (spawns.length == 0) {
                            let spawnscons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_SPAWN } });
                            if (spawns.length == 0) {
                                let flags = room.find(FIND_FLAGS, { filter: { color: COLOR_WHITE } });
                                if (flags.length > 0) {
                                    let err = flags[0].pos.createConstructionSite(STRUCTURE_SPAWN);
                                    if (err == OK)
                                        console.log("build new spawn in", room.name);
                                    else {
                                        console.log("failed to build spawn ", PrettyPrintErr(err));
                                        return;
                                    }

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
                            pos.x += 3;
                            pos.y += 3;
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
                        let storage = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_STORAGE } });
                        let storagecons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_STORAGE } });
                        if (storage.length == 0 && storagecons.length == 0) {
                            let pos = spawns[0].pos;
                            pos.x += 0;
                            pos.y += 1;
                            let err = pos.createConstructionSite(STRUCTURE_STORAGE);
                            if (err == OK) {
                                console.log("built storage in ", room.name);
                            }
                            else {
                                console.log("failed to build storage in ", room.name, PrettyPrintErr(err));
                                return;
                            }
                            
                        }
                        room.memory.ExpandedLevel = 4;
                    } //else if (room.memory.ExpandedLevel == 3) {
                    //    let storage = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
                    //    let storagecons = room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
                    //    if (storage.length + storagecons.length <= 1) {
                    //        let pos = spawns[0].pos;
                    //        pos.x += 3;
                    //        pos.y += 3;
                    //        let err = pos.createConstructionSite(STRUCTURE_TOWER);
                    //        if (err != OK) {
                    //            pos.x -= 6;
                    //            err = pos.createConstructionSite(STRUCTURE_TOWER);
                    //        }
                    //        if (err == OK) {
                    //            console.log("built tower in ", room.name);
                    //        }
                    //        else {
                    //            console.log("failed to build tower in ", room.name, PrettyPrintErr(err));
                    //            return;
                    //        }
                    //    }
                    //    room.memory.ExpandedLevel = 5;
                    //}
                } 
            }
            catch (e) {

            }
        }
    }

}
