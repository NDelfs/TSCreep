import { getEnergyTarget, useEnergyTarget, getMineralTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget, getNewDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";

function claimResource(creep: Creep, target: targetData | null) {
    if (target) {
        Memory.Resources[target.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }
    
}

export function Transporter(creep: Creep) {
    let room = creep.room;
    //if (creep.getTarget() == null) {
    //    //get key of already resources
    //    let keys = Object.keys(creep.store);
    //    let key: ResourceConstant | null = null;
    //    for (let tmpKey of keys) {

    //    }

    //    let delTarget = getNewDeliverTarget(creep.pos);
    //    if (delTarget) {
    //        let getTarget = getFromStoreTarget(creep, delTarget.resType!)
    //        if (getTarget) {//no need to have del target if no res excist
    //            creep.addTargetT(getTarget);
    //            creep.addTargetT(delTarget);
    //        }
    //    }
    //    else {

    //    }
    //}
    
    if (creep.carryAmount == 0 && creep.getTarget() == null) {
        try {
            let target = getEnergyTarget(creep);
            if (target) {
                creep.addTargetT(target);
                claimResource(creep, target);
            }
            else if (PM.colonies[creep.memory.creationRoom].spawnEnergyNeed > 0 || (room.memory.controllerStoreID && PM.colonies[creep.memory.creationRoom].resourceRequests[room.memory.controllerStoreID] && PM.colonies[creep.memory.creationRoom].resourceRequests[room.memory.controllerStoreID].amount() < 1500)) { //so that we always fill up the energy need of a room
                target = getFromStoreTarget(creep, RESOURCE_ENERGY);
                if (target)
                    creep.addTargetT(target);
            }
        }
        catch (e) {
            console.log("CRASH: Could not get energy target", e);
        }
        try {
            if (creep.getTarget() == null) {
                let target = getMineralTarget(creep);
                if (target) {
                    creep.addTargetT(target);
                    claimResource(creep, target);
                }
            }
        }
        catch{
            console.log("CRASH: could not get mineral target")
        }
    }
    else if (creep.getTarget() == null) {
       getDeliverTarget(creep, true);
    }
    
    let target = creep.getTarget();
    if (target == null) {
        creep.say("zZzZ")
    }
    else if (target && creep.inPlace) {
        switch (target.type) {
            case targetT.POWERSTORAGE:
            case targetT.TRANSPORT:
            case targetT.POWERUSER: useDeliverTarget(creep); break;
            case targetT.DROPPED_MINERAL:
            case targetT.DROPPED_ENERGY: useEnergyTarget(creep, target); break;
            default: console.log("Canceled ", target.type); creep.completeTarget();
    }
    }
}
