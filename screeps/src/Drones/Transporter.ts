import { getSourceTarget, useEnergyTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { useDeliverTarget, getNewDeliverTarget, getStorageDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";
import { TRANSPORT, DROPPED_RESOURCE, TRANSPORT_PICKUP, POWERUSER, POWERSTORAGE, STORAGE_RESOURCE } from "Types/TargetTypes";
import { Colony } from "../Colony";

function claimResource(creep: Creep, target: targetData | null) {
    if (target) {
        Memory.Resources[target.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }

}

function claimDeliver(creep: Creep, target: targetData) {
    //if (creep.pos.roomName == "E47N45")
        //console.log(creep.name, "claiming dropped", target.pos.x, target.pos.y, target.ID, target.type);
    if (target.type == POWERSTORAGE || target.type == STORAGE_RESOURCE)
        return;
    if (target.type == DROPPED_RESOURCE) {
        Memory.Resources[target.ID].AvailResource -= creep.carryCapacity;
        return;
    }
    let colony = PM.colonies[creep.memory.creationRoom];
    if (target.type == TRANSPORT_PICKUP) {
        colony.resourcePush[target.ID].addTran(creep, creep.carryCapacity);//should be target req amount, but now there is nothing there
        return;
    }

    if (target.type == TRANSPORT) {
        colony.resourceRequests[target.ID].addTran(creep, creep.carryCapacity);//should be target req amount, but now there is nothing there
        return;
    }
    if (target.type == POWERUSER) {
        colony.addEnergyTran(creep, creep.carryCapacity);
        return;
    }
    console.log("claiming unknown", target.type);
}

export function Transporter(creep: Creep) {
    let room = creep.room;
    if (creep.getTarget() == null) {
        //get key of already resources
        let key: ResourceConstant | null = null;
        for (let tmpKey of Object.keys(creep.store)) {
            if (creep.store[tmpKey as ResourceConstant] > 0) {
                key = tmpKey as ResourceConstant;
                break;
            }
        }

        //find if resource are nedded, if so then pick up from storage
        let targets = getNewDeliverTarget(creep, key);
        if (targets.length == 0) {//there is the case when do recource could be found for a deliver target above. A lab require a super rare resource, the creep would go into last if but not get a target
            if (key == null) {
                let target = getSourceTarget(creep, null);
                if (target) {
                    targets.push(target);
                    key = target.resType!;
                }
            }
            if (key) {
                let target = getStorageDeliverTarget(room, key);
                if (target) {
                    targets.push(target);
                }
            }
        }
        for (let target of targets) {
            creep.addTargetT(target);
            claimDeliver(creep, target);
        }
    }

    let target = creep.getTarget();
    if (target == null) {
        creep.say("zZzZ")
    }
    else if (creep.inPlace) {
        switch (target.type) {
            case targetT.POWERSTORAGE:
            case targetT.TRANSPORT:
            case targetT.POWERUSER: useDeliverTarget(creep); break;
            case targetT.TRANSPORT_PICKUP:
            case targetT.STORAGE_RESOURCE:
            case targetT.DROPPED_RESOURCE: useEnergyTarget(creep, target); break;
            default: console.log("Canceled ", target.type); creep.completeTarget();
        }
    }
}
