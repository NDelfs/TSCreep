import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { restorePos } from "utils/posHelpers";
import { goToTarget } from "Drones/Funcs/Walk"
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { getEnergyTarget, useEnergyTarget } from "./Funcs/DroppedEnergy";



function printRes(creep: Creep, iErr: number, name: string): void {
    if (iErr == OK)
        creep.say("OK " + name);
    else
        creep.say(name + " " + PrettyPrintErr(iErr));
}

export function Starter(creep: Creep) {
    //got no energy, find where
    if (creep.memory.currentTarget == null && creep.carry.energy == 0) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget) {
            Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
            creep.say("Go to source")
        }

        if (creep.memory.currentTarget == null) {
            const harvesters = _.filter(Game.creeps, function (creepF) { return creepF.memory.type == creepT.HARVESTER && creepF.memory.mainTarget == creep.memory.mainTarget });
            if (harvesters.length == 0) {
                let source: Source | null = Game.getObjectById(creep.memory.mainTarget);
                if (source) {
                    let sourceMem: SourceMemory = Memory.Sources[source.id];
                    creep.say("go mining");
                    creep.memory.currentTarget = { ID: source.id, type: targetT.SOURCE, pos: sourceMem.workPos, range: 0 };
                }
            }
        }
    }
    else {
        if (creep.memory.currentTarget == null) {
            let availBuild = Game.rooms[creep.memory.creationRoom].memory.EnergyNeedStruct;
            if (availBuild.length > 0) {
                creep.memory.currentTarget = availBuild[0];
                availBuild.shift();
            }
        }
        if (creep.memory.currentTarget == null) {
            let controller = creep.room.controller;
            if (controller) {
                let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION || STRUCTURE_CONTAINER } });
                //let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
                if (controller.ticksToDowngrade > 2000 && inQue.length > 0) {
                    creep.memory.currentTarget = { ID: inQue[0].id, type: targetT.CONSTRUCTION, pos: inQue[0].pos, range: 3 };
                    //console.log("Build extension with tics left ", controller.ticksToDowngrade)
                }
                else {
                    let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
                    if (controller.ticksToDowngrade > 2000 && inQue.length > 0) {
                        creep.memory.currentTarget = { ID: _.first(inQue).id, type: targetT.CONSTRUCTION, pos: inQue[0].pos, range: 3 };
                        //console.log("Build construction set with tics left ", controller.ticksToDowngrade)
                    }
                    else
                        creep.memory.currentTarget = { ID: controller.id, type: targetT.CONTROLLER, pos: controller.pos, range: 3 };
                }
            }
        }
        if (creep.memory.currentTarget == null) {
            console.warn("Harvester could not find a target");
            return;
        }
    }

    ///////////////use the target///////////
    if (creep.memory.currentTarget && goToTarget(creep)) {      
        switch (creep.memory.currentTarget.type) {
            case targetT.DROPPED_ENERGY: {
                const err = useEnergyTarget(creep, creep.memory.currentTarget);
                printRes(creep, err, "transf");
                creep.memory.currentTarget = null;
                return;
            }
            case targetT.SOURCE: {
                let source: Source | null = Game.getObjectById(creep.memory.mainTarget);
                if (source) {
                    const err = creep.harvest(source);
                    if (err == OK && creep.carry.energy == creep.carryCapacity)
                        creep.memory.currentTarget = null;
                    else
                        printRes(creep, err, "mine");
                    //multi tic action so no reset per defauls
                    return;
                }
                else
                    creep.memory.currentTarget = null
            }
            case targetT.CONTROLLER: {
                if (creep.room.controller) {
                    const err = creep.upgradeController(creep.room.controller);
                    printRes(creep, err, "upgrade");
                }
                else
                    creep.memory.currentTarget = null
                break;
            }
            case targetT.CONSTRUCTION: {
                let con: ConstructionSite | null = Game.getObjectById(creep.memory.currentTarget.ID);
                if (con) {
                    const err = creep.build(con);
                    printRes(creep, err, "Build");
                }
                else
                    creep.memory.currentTarget = null
                break;
            }
            case targetT.STRUCTURE: {
                let target: Structure | null = Game.getObjectById(creep.memory.currentTarget.ID);
                if (target) {
                    const err = creep.transfer(target, RESOURCE_ENERGY);
                    if (err != ERR_FULL && err!=OK) {
                        creep.say("give " + PrettyPrintErr(err));
                    }
                    else
                        creep.say("OK give")
                }   
                creep.memory.currentTarget = null;
                break;
            }
            default: {
                creep.memory.currentTarget = null;
                throw ("The target type is not handled");
            }
        }

        if (creep.carry.energy == 0) {
            creep.say("reset");
            creep.memory.currentTarget = null;
        }
    }
}

