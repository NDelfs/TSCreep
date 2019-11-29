import { PrettyPrintErr } from "utils/PrettyPrintErr";
import * as targetT from "Types/TargetTypes";
import { getEnergyTarget, useEnergyTarget } from "./Funcs/DroppedEnergy";
import { restorePos } from "../utils/posHelpers";
import { resetDeliverTarget, getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "./Funcs/Build";
import { HARVESTER } from "Types/CreepType";

function printRes(creep: Creep, iErr: number, name: string): void {
    if (iErr == OK)
        creep.say("OK " + name);
    else
        creep.say(name + " " + PrettyPrintErr(iErr));
}

export function Starter(creep: Creep) {
    resetDeliverTarget(creep);

    //got no energy, find where
    if (creep.currentTarget == null && creep.carry.energy == 0) {
        creep.currentTarget = getEnergyTarget(creep);
        if (creep.currentTarget) {
            Memory.Resources[creep.currentTarget.ID].AvailResource -= creep.carryCapacity;
            creep.say("Go to source")
        }

        if (creep.currentTarget == null) {
            const harvesters = _.filter(creep.room.getCreeps(HARVESTER), function (creepF) { return creepF.memory.permTarget && creep.memory.permTarget && creepF.memory.permTarget.ID == creep.memory.permTarget.ID });
            if (harvesters.length == 0) {
                if (creep.memory.permTarget == null)
                    throw ("no permanent target on starter");
                let source: Source | null = Game.getObjectById(creep.memory.permTarget.ID);
                if (source) {
                    let sourceMem: SourceMemory = Memory.Resources[source.id];
                    creep.say("go mining");
                    creep.addTarget(source.id, targetT.SOURCE, sourceMem.pos, 1 );
                }
            }
        }
    }
    else {
        if (!getDeliverTarget(creep, false)) {
            let controller = creep.room.controller;
            if (controller) {//if safe tick run external construction target getter, same used for builder
                if (controller.ticksToDowngrade > 5000) {
                    getRepairTarget(creep);            
                    if (creep.currentTarget == null) {
                        getBuildTarget(creep);
                    }
                }
                if (creep.currentTarget == null)
                    creep.addTarget( controller.id, targetT.CONTROLLER, controller.pos, 3 );
                
            }
        }
        if (creep.currentTarget == null) {
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
    if (creep.currentTarget && creep.inPlace) {
        switch (creep.currentTarget.type) {
            case targetT.DROPPED_ENERGY: {
                const err = useEnergyTarget(creep, creep.currentTarget);
                printRes(creep, err, "transf");
                return;
            }
            case targetT.SOURCE: {
                if (creep.memory.permTarget == null)
                    throw ("no permanent target on starter");
                let source: Source | null = Game.getObjectById(creep.memory.permTarget.ID);
                if (source) {
                    const err = creep.harvest(source);
                    if (err == OK && creep.carry.energy == creep.carryCapacity)
                        creep.currentTarget = null;
                    else
                        printRes(creep, err, "mine");
                    //multi tic action so no reset per defauls
                    return;
                }
                else
                    creep.currentTarget = null
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
                    creep.currentTarget = null
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
            case targetT.TRANSPORT:
            case targetT.POWERUSER: {
                const err = useDeliverTarget(creep);
                printRes(creep, err, "transf");
                break;
            }
            default: {
                let type = creep.currentTarget.type;
                creep.currentTarget = null;
                throw ("The target type is not handled " + type);
            }
        }
    }
}

