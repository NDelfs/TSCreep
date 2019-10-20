import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { restorePos } from "../utils/posHelpers";
import * as creepT from "creepType";
export function Starter(creep: Creep) {
    if (creep.memory.working) {
        for (let [indx, ID] of Object.entries(creep.room.memory.sourcesUsed)) {
            let sourceMem: SourceMemory = Memory.Sources[ID];
            if (sourceMem.AvailEnergy > creep.carryCapacity * 0.8) {
                const workPos = restorePos(sourceMem.workPos);
                let res = workPos.lookFor(LOOK_RESOURCES);
                if (res.length > 0) {
                    creep.memory.currentTarget = res[0].id;
                    creep.memory.targetType = RESOURCE_ENERGY;
                    creep.memory.working = false;
                    sourceMem.AvailEnergy -= creep.carryCapacity;
                    creep.say("Go to so " + indx);
                    break;
                }
            }
        }
        //if (workPos.getRangeTo(creep.pos.x,creep.pos.y)>1) {
          //  creep.moveTo(workPos);
        //}

        const harvesters = _.filter(Game.creeps, function (creepF) { return creepF.memory.type == creepT.TRANSPORTER && creepF.memory.mainTarget == creep.memory.mainTarget });
        if (harvesters.length == 0) {
            let source: Source | null = Game.getObjectById(creep.memory.mainTarget);
            if (source) {
                let harvestErr = creep.harvest(source);
                if (harvestErr == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                else if (harvestErr == OK && creep.carry.energy == creep.carryCapacity)
                    creep.memory.working = false;
            }
        }
    }
    else {
        if (creep.memory.currentTarget == null) {
            let availBuild = Game.rooms[creep.memory.creationRoom].memory.EnergyNeedStruct;
            if (availBuild.length > 0) {
                creep.memory.currentTarget = _.first(availBuild);
                creep.memory.deliver = true;
                availBuild.shift();
            }        
        }
        if (creep.memory.currentTarget == null) {
            let controller = creep.room.controller;
            if (controller) {
                let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION || STRUCTURE_CONTAINER } });
                //let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_TOWER } });
                if (controller.ticksToDowngrade > 2000 && inQue.length > 0) {
                    creep.memory.currentTarget = _.first(inQue).id;
                    console.log("Build extension with tics left ", controller.ticksToDowngrade)
                }
                else {
                    let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
                    if (controller.ticksToDowngrade > 2000 && inQue.length > 0) {
                        creep.memory.currentTarget = _.first(inQue).id;
                        console.log("Build construction set with tics left ", controller.ticksToDowngrade)
                    }
                    else
                        creep.memory.currentTarget = controller.id;
                }
            }
        }
        if (creep.memory.currentTarget == null) {
            console.warn("Harvester could not find a target");
            return;
        }

        if (creep.memory.targetType == RESOURCE_ENERGY) {
            let targetObj: Resource | null = Game.getObjectById(creep.memory.currentTarget);
            if (targetObj) {
                const err = creep.pickup(targetObj);
                if (err == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetObj.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
                    return;
                }
                else if (err == OK) {
                    creep.say("OK transf");
                    creep.memory.targetType = "";
                    creep.memory.currentTarget = null;
                    return;
                }
            }
            //if here reset
                creep.say("Cancel Res");
                creep.memory.targetType = "";
                creep.memory.currentTarget = null;
                return;
            
        }
        else if (creep.room.controller && creep.memory.currentTarget == creep.room.controller.id) {

            let transfErr = creep.upgradeController(creep.room.controller);
            if (transfErr == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else {
            let targetObj: RoomObject | null = Game.getObjectById(creep.memory.currentTarget);
            if (targetObj) {
                if (targetObj.pos.lookFor(LOOK_CONSTRUCTION_SITES).length>0) {
                    let con = targetObj as ConstructionSite;
                    let builderr = creep.build(con);
                    if (builderr == ERR_NOT_IN_RANGE) {
                        creep.moveTo(con.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                    else if (builderr != OK) {

                        //creep.memory.currentTarget = null;
                        console.log(PrettyPrintErr(builderr) + " err build with energy " + creep.carry[RESOURCE_ENERGY]);
                        creep.say("Build failed with " + PrettyPrintErr(builderr));
                    }
                }
                else {

                    if (targetObj.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                        let target = targetObj as Structure;
                        let transfErr = creep.transfer(target, RESOURCE_ENERGY);
                        if (transfErr == ERR_NOT_IN_RANGE) {
                            creep.moveTo(target.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                        else if (transfErr == ERR_FULL) {
                            creep.memory.currentTarget = null;
                        }
                    }
                }
            }
            else {


                creep.memory.currentTarget = null;
                creep.say("Could not find targen. reseted");
            }


        }
        if (creep.carry.energy == 0) {
            creep.say("reset");
            creep.memory.working = true;
            creep.memory.currentTarget = null;
            creep.memory.deliver = false;
        }
    }
}
