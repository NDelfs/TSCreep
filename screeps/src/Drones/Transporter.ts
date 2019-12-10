import { getSourceTarget, useEnergyTarget, getMineralTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget, getNewDeliverTarget, getStorageDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";
import { TRANSPORT, DROPPED_RESOURCE, TRANSPORT_PICKUP, POWERUSER } from "Types/TargetTypes";
import { Colony } from "../Colony";

function claimResource(creep: Creep, target: targetData | null) {
    if (target) {
        Memory.Resources[target.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }
    
}

function claimDeliver(creep: Creep, target: targetData) {
    if (target.type == DROPPED_RESOURCE) {
        //console.log("claiming dropped", target.ID);
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
  //if (room.name == "E47N45") {
  //  console.log('in transporter');
  //}
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
            let delTarget = getNewDeliverTarget(creep.pos, key);
          if (delTarget) {
           // if (room.name == "E47N45") {
             // console.log('in transporter, tried to get delTarget', delTarget.pos.x, delTarget.pos.y, key);
           // }
                if (key) {
                    creep.addTargetT(delTarget);
                  claimDeliver(creep, delTarget);
                  //if (room.name == "E47N45")
                  //  console.log("added one del target", delTarget.pos.x, delTarget.pos.y);
                }
                else {
                    let getTarget = getFromStoreTarget(creep, delTarget.resType!)
                    if (getTarget) {//no need to have del target if no res excist
                        creep.addTargetT(getTarget);
                        creep.addTargetT(delTarget);
                      claimDeliver(creep, delTarget);
                      //if (room.name == "E47N45")
                      //  console.log("added two target with deliver from storage", delTarget.pos.x, delTarget.pos.y);
                    }
                }
          }
          if (creep.getTarget()== null) {//there is the case when do recource could be found for a deliver target above. A lab require a super rare resource, the creep would go into last if but not get a target
                if (key == null) {
                  let target = getSourceTarget(creep, null);
                  //if (room.name == "E47N45") {
                  //  console.log('in transporter, tried to get source', target,key);
                  //}
                    if (target) {
                        creep.addTargetT(target);
                        claimDeliver(creep, target);
                        key = target.resType!;
                        //console.log("added source target", target.ID, target.type);
                    }
                }
                if (key) {
                  let target = getStorageDeliverTarget(room, key);
                  //if (room.name == "E47N45") {
                  //  console.log('in transporter, tried to get store',target,key);
                  //}
                    if (target) {
                        creep.addTargetT(target);
                        //console.log("added deliver to storage");
                    }
                }
            }
        }
   // }
    //else {
    //    if (creep.carryAmount == 0 && creep.getTarget() == null) {
    //        try {
    //            let target = getSourceTarget(creep, RESOURCE_ENERGY);
    //            if (target) {
    //                creep.addTargetT(target);
    //                claimResource(creep, target);
    //            }
    //            else if (PM.colonies[creep.memory.creationRoom].spawnEnergyNeed > 0 || (room.memory.controllerStoreID && PM.colonies[creep.memory.creationRoom].resourceRequests[room.memory.controllerStoreID] && PM.colonies[creep.memory.creationRoom].resourceRequests[room.memory.controllerStoreID].amount() < 1500)) { //so that we always fill up the energy need of a room
    //                target = getFromStoreTarget(creep, RESOURCE_ENERGY);
    //                if (target)
    //                    creep.addTargetT(target);
    //            }
    //        }
    //        catch (e) {
    //            console.log("CRASH: Could not get energy target", e);
    //        }
    //        try {
    //            if (creep.getTarget() == null) {
    //                let target = getMineralTarget(creep);
    //                if (target) {
    //                    creep.addTargetT(target);
    //                    claimResource(creep, target);
    //                }
    //            }
    //        }
    //        catch{
    //            console.log("CRASH: could not get mineral target")
    //        }
    //    }
    //    else if (creep.getTarget() == null) {
    //        getDeliverTarget(creep, true);
    //    }
    //}
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
            case targetT.DROPPED_RESOURCE: useEnergyTarget(creep, target); break;
            default: console.log("Canceled ", target.type); creep.completeTarget();
    }
    }
}
