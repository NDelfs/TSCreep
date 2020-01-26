import { HARVESTER, TRANSPORTER, STARTER, BUILDER } from "Types/CreepType";

//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { RemoteInfo } from "dgram";


export class resourceRequest {
  id: string;
  resource: ResourceConstant;
  ThreshouldAmount: number;//if its acceptable to end early
  ThreshouldHard: number;//the absolute value requested
  creeps: string[];
  resOnWay: number;
  createdTime: number;
  hasStore: boolean;

  constructor(ID: string, iResource: ResourceConstant, iThreshould: number, iThreshouldMax: number, room: Room, hasNoStore? : boolean) {
    this.id = ID;
    this.createdTime = Game.time;
    this.resource = iResource;
    this.ThreshouldAmount = iThreshould;
    this.ThreshouldHard = iThreshouldMax;
    this.hasStore = !hasNoStore;
    this.resOnWay = 0;
    //this.creeps = [];
    this.creeps = _.filter(room.getCreeps(TRANSPORTER), function (obj) {
      return obj.alreadyTarget(ID);
    }).map((obj) => { return obj.name; });
    this.updateCreepD();
  }

  public amount(): number {
    let amount = 0;
    if (this.hasStore) {
      let obj = Game.getObjectById(this.id) as AnyStoreStructure;
      if (obj) {
        amount = obj.store[this.resource];
      }
    }
    else {
      let obj = Game.getObjectById(this.id) as Resource;
      if (obj) {
        amount = obj.amount;
      }
    }

      if (this.ThreshouldHard > this.ThreshouldAmount)
        return amount + this.resOnWay;
      else
        return amount - this.resOnWay;
  }

  public updateCreepD() {
    this.resOnWay = 0;
    let creepsTmp = _.compact(_.map(this.creeps, obj => Game.creeps[obj]));
    this.creeps = [];
    for (let creep of creepsTmp) {
      let found = false;
      for (let targ of creep.memory.targetQue) {
        if (targ.ID == this.id) {
          this.resOnWay += creep.carry[this.resource];
          this.creeps.push(creep.name);
          found = true;
        }
      }
      if (!found) {
        console.log(creep.room.name, creep.name, "where not activly working for resource anymore", this.resource, this.id);
      }
    }
  }

  public addTran(creep: Creep, preknownAmount?: number) {
    let already = _.find(this.creeps, (mCreep) => mCreep == creep.name) || false;
    if (!already) {
      this.creeps.push(creep.name);
      this.resOnWay += preknownAmount || creep.carry[this.resource];
    }
  }
  public removeTran(creep: Creep, preknownAmount?: number) {
    let removed = _.remove(this.creeps, (mCreep) => mCreep == creep.name);
    if (removed.length > 0) {
      this.resOnWay -= preknownAmount || creep.carry[this.resource];
      if (this.resOnWay < 0) {
        console.log(creep.room.name, creep.name, this.id, "res on way went negative, carry", creep.carry[this.resource], preknownAmount || creep.carry[this.resource], "Soft, hard", this.ThreshouldAmount, this.ThreshouldHard);
        this.resOnWay = Math.max(this.resOnWay, 0);
      }
    }
    if (this.creeps.length == 0)
      this.resOnWay = 0;
  }

  public postRun() {

  }
}
profiler.registerClass(resourceRequest, 'resourceRequest');

export class ResourceHandler {
  room: Room;
  _resourceRequests: { [id: string]: resourceRequest[] };
  resourcePush: { [id: string]: resourceRequest };
  constructor(iRoom: Room, boosts: BoostMemory[], labs: StructureLab[]) {
    this.room = iRoom;
    this.resourcePush = {};
    this._resourceRequests = {};
    this.rebuildBoostResourceReq(boosts, labs);//instead of loading resources from memory
  }

  public getReq(id: string, res: ResourceConstant): resourceRequest | undefined {
    if (this._resourceRequests[id])
      return this._resourceRequests[id].find((req) => { return req.resource == res });
    return undefined;
  }

  public refresh() {
    if (Game.time % 100 == 0) {
      for (let id in this._resourceRequests) {
        let removed = _.remove(this._resourceRequests[id], (e) => { return Game.time - e.createdTime > 500 });
        for (let rem of removed) {
          console.log(this.room.name, "Removed request", JSON.stringify(rem));
        }
        if (this._resourceRequests[id].length == 0)
          delete this._resourceRequests[id];
      }
    }
}

  public removeTranReq(id: string, res: ResourceConstant, creep: Creep) {
    let req = this.getReq(id, res);
    if (req) {
      let targetObj = Game.getObjectById(id) as AnyStoreStructure;
      if (req.creeps.length == 1 && targetObj.store[req.resource] + req.resOnWay >= req.ThreshouldHard) {
        _.remove(this._resourceRequests[id], (req) => { return req.resource == res });
      }
      else {
        req.removeTran(creep);
      }
    }
    else
      console.log("tried to use a target req that is already deleted")
  }

  public addRequest(req: resourceRequest) {
    if (this._resourceRequests[req.id] == null)
      this._resourceRequests[req.id] = [];
    this._resourceRequests[req.id].push(req);
  }

  private rebuildBoostResourceReq(boosts: BoostMemory[], labs: StructureLab[]) {//only needed because we do not sava resource reqs
    try {
      for (let boost of boosts) {
        let amount = boost.boostCost * boost.nrCreep;
        let lab = labs[boost.labID];
        if (lab.store[boost.boost] < amount) {
          this.addRequest(new resourceRequest(lab.id, boost.boost, amount - 1, amount, this.room));
        }
        if (lab.store.energy < amount) {
          this.addRequest(new resourceRequest(lab.id, RESOURCE_ENERGY, amount - 1, amount, this.room));
        }
        console.log(this.room.name, "rebuild boost res req", JSON.stringify(this._resourceRequests[lab.id]));
      }
    }
    catch (e) {
      console.log("failed to rebuild boost req", e);
    }
  }

  removeDeadCreep(name: string, cMem: CreepMemory) {

  }

  public postRun() {
   
  }
}
profiler.registerClass(ResourceHandler, 'ResourceHandler');
