import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { goToTarget } from "Drones/Funcs/Walk"
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { getEnergyTarget, useEnergyTarget } from "./Funcs/DroppedEnergy";
import { restorePos } from "../utils/posHelpers";
import { resetDeliverTarget, getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "./Funcs/Build";

function printRes(creep: Creep, iErr: number, name: string): void {
    if (iErr == OK)
        creep.say("OK " + name);
    else
        creep.say(name + " " + PrettyPrintErr(iErr));
}

export function Starter(creep: Creep) {
    resetDeliverTarget(creep);

    //got no energy, find where
    if (creep.memory.currentTarget == null && creep.carry.energy == 0) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget) {
            Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
            creep.say("Go to source")
        }

        if (creep.memory.currentTarget == null) {
            const harvesters = _.filter(Game.creeps, function (creepF) { return creepF.memory.type == creepT.HARVESTER && creepF.memory.permTarget && creep.memory.permTarget && creepF.memory.permTarget.ID == creep.memory.permTarget.ID });
            if (harvesters.length == 0) {
                if (creep.memory.permTarget == null)
                    throw ("no permanent target on starter");
                let source: Source | null = Game.getObjectById(creep.memory.permTarget.ID);
                if (source) {
                    let sourceMem: SourceMemory = Memory.Sources[source.id];
                    creep.say("go mining");
                    creep.memory.currentTarget = { ID: source.id, type: targetT.SOURCE, pos: sourceMem.pos, range: 1 };
                }
            }
        }
    }
    else {
        if (creep.memory.currentTarget == null) {
            creep.memory.currentTarget = getDeliverTarget(creep, false);
        }
        if (creep.memory.currentTarget == null) {
            let controller = creep.room.controller;
            if (controller) {//if safe tick run external construction target getter, same used for builder
                if (controller.ticksToDowngrade > 5000) {
                    getRepairTarget(creep);            
                    if (creep.memory.currentTarget == null) {
                        getBuildTarget(creep);
                    }
                }
                if (creep.memory.currentTarget== null)
                    creep.memory.currentTarget = { ID: controller.id, type: targetT.CONTROLLER, pos: controller.pos, range: 3 };
                
            }
        }
        if (creep.memory.currentTarget == null) {
            console.warn("Harvester could not find a target");
            return;
        }
    }

    //repair roads
    if ((creep.room.controller == null || creep.room.controller.level < 3) && creep.carry.energy > 0) {
        let road = creep.pos.lookFor(LOOK_STRUCTURES);
        if (road.length > 0 && road[0].hits < road[0].hitsMax) {
            let err = creep.repair(road[0]);
            if (err==OK)
                creep.say("repaired");
        }
        let roadCon = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (roadCon.length >0) {
            const err = creep.build(roadCon[0]);
            if (err == OK)
                creep.say("built");
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
                if (creep.memory.permTarget == null)
                    throw ("no permanent target on starter");
                let source: Source | null = Game.getObjectById(creep.memory.permTarget.ID);
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
                break;
            }
            case targetT.CONTROLLER: {
                if (creep.room.controller) {
                    let err = creep.upgradeController(creep.room.controller);
                    if (err == ERR_NOT_OWNER) {
                        err = creep.claimController(creep.room.controller);
                        if (err == ERR_NOT_IN_RANGE)
                            creep.moveTo(creep.room.controller);
                       
                    }
                    printRes(creep, err, "upgrade");
                }
                else
                    creep.memory.currentTarget = null
                break;
            }
            case targetT.CONSTRUCTION: {
                let err = useBuildTarget(creep);
                printRes(creep, err, "build");
                break;
            }
            case targetT.REPAIR: {
                let err = useRepairTarget(creep);
                printRes(creep, err, "rep");
                break;
            }
            case targetT.POWERSTORAGE:
            case targetT.POWERUSER: {
                const err = useDeliverTarget(creep, creep.memory.currentTarget);
                printRes(creep, err, "transf");
                break;
            }
            case targetT.POSITION: {
                const workPos = restorePos(creep.memory.currentTarget.pos);
                if (creep.pos.getRangeTo(workPos.x, workPos.y) <= creep.memory.currentTarget.range && workPos.roomName == creep.pos.roomName)
                    creep.memory.currentTarget = null;
                break;
            }
            default: {
                let type = creep.memory.currentTarget.type;
                creep.memory.currentTarget = null;
                throw ("The target type is not handled " + type);
            }
        }
    }
}

