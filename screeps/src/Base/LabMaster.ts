import { Colony } from "Colony"
import { REACTION_CHAIN, IReaction, REACTION, REACTREGENT } from "Types/Constants"
import { ResourceHandler, resourceRequest } from "Base/Handlers/ResourceHandler";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

interface labGroup {
  idxs: number[], final: boolean;
}

interface IRoomReactions {
  react: IReaction,
  result: labGroup,
  res1: labGroup,
  res2: labGroup,
}

interface IRoomLabs {
  nrLabs: number,
  nrLabUsed: number,
  colony: string,
  roomReaction: IRoomReactions[],
}

interface GlobMineralReq {
  r: IReaction;
  perRoom: number; //total goal would then be nrRoom*perRoom + global
  global: number;
  perTick: number; //expected tick rate per room
}

const REACTION_TIME_TYPED = REACTION_TIME as { [react: string]: number };

interface MineralReq {
  r: IReaction;
  reactPerTic: number;
  autoAdded: boolean;
  masterReq: ResourceConstant|null;
}

const reactionsWanted: GlobMineralReq[] = [//half global init a restart of prod
  { r: REACTION_CHAIN["LH"], perRoom: 2000, global: 5000, perTick: 0.06 },//cheap boost for building
  { r: REACTION_CHAIN["UO"], perRoom: 2000, global: 5000, perTick: 0.1 },
  { r: REACTION_CHAIN["XGH2O"], perRoom: 2000, global: 5000, perTick: 0.075 },//number is dependent on recycling creep, should be 15 but decreased to fit until a bottom up approach is used
  { r: REACTION_CHAIN["G"], perRoom: 0, global: 2e4, perTick: 0.1 },//keep some for nukes and GH
  { r: REACTION_CHAIN["OH"], perRoom: 0, global: 2e4, perTick: 0.1 },//keep some for nukes and GH
  /*, REACTION_CHAIN["XGH2O"]*/
];

const UPDATETIME = 1000;//this also affect the threshould before adding a auto minReq

export class LabMaster {
  colonies: { [name: string]: Colony };
  colLabs: IRoomLabs[];
  nrLabs: number;
  resources: { [name: string]: number };
  reactionsToAdd: GlobMineralReq[];
  tickSinceUpdate: number;
  constructor(iColonies: { [name: string]: Colony }) {
    this.colonies = iColonies;
    this.reactionsToAdd = reactionsWanted;
    this.resources = {};
    this.colLabs = [];
    this.nrLabs = 0;
    this.tickSinceUpdate = 0;
    try {
      this.updateLabInfo();
      this.filterReactions();//do not care if list is changed, uses that lab info is updated 
      this.distibuteReactions();
      this.resourceRequests();
    } catch (e) {
      console.log("failed lab construction", e);
    }
  };

  getSlaveLab(colony: Colony, react: labGroup, fullReact: IRoomReactions, mainNr: number) {
    let masterLabs = fullReact.result.idxs.length;
    if (react.idxs.length == 1) {
      return react.idxs[0];
    }
    else if (react.idxs.length == masterLabs) {
      return react.idxs[mainNr];
    }
    else if (masterLabs * 2 == react.idxs.length) {
      return react.idxs[Math.floor(mainNr/2)]
    }
    for (let idx of react.idxs) {
      if ((colony.labs[idx].store.getUsedCapacity() || 0) >= masterLabs * 5) {
        return idx;
      }
    }
    return react.idxs[0];//just to return something
  }

  run() {
    try {
      for (let roomRun of this.colLabs) {
        let colony = this.colonies[roomRun.colony];
        let resHandler = colony.resourceHandler;
        for (let react of roomRun.roomReaction) {
          if (colony.labs[react.result.idxs[0]].cooldown != 0)
            continue;
          for (let i = 0; i < react.result.idxs.length; i++) {
            //for (let mainIdx of react.result.idxs) {
            let main0 = colony.labs[react.result.idxs[i]];
            let first = colony.labs[this.getSlaveLab(colony, react.res1, react, i)];
            let firstAmount = first.store[react.react.needs[0]];
            let second = colony.labs[this.getSlaveLab(colony, react.res2, react, i)];
            let secondAmount = second.store[react.react.needs[1]];
            if (main0.cooldown == 0 && firstAmount != 0 && secondAmount != 0 && main0.store[react.react.r] < 2000) {
              for (let idx of react.result.idxs) {
                let main = colony.labs[idx];
                main.runReaction(first, second);
                if (react.result.final && main.store[react.react.r] >= 1000 && resHandler.resourcePush[main.id] == null) {
                  resHandler.resourcePush[main.id] = (new resourceRequest(main.id, react.react.r, 1000, 200, colony.room));
                  console.log(colony.name, "push resource from lab", react.react.r, "final", react.result.final);
                }
              }
            }
            
            if (this.tickSinceUpdate >= 5) {//if empty we do not want to spam the getReq but still 7 labs can maximum use 175 res in that time
              if (firstAmount < 200 && resHandler.getReq(first.id, react.react.needs[0]) == null) {
                resHandler.addRequest(new resourceRequest(first.id, react.react.needs[0], 200, 800, colony.room));
                console.log(colony.name, "request resource to lab", react.react.needs[0], firstAmount);
              }
              if (secondAmount < 200 && resHandler.getReq(second.id, react.react.needs[1]) == null) {
                resHandler.addRequest(new resourceRequest(second.id, react.react.needs[1], 200, 800, colony.room));
                console.log(colony.name, "request resource to lab", react.react.needs[1], secondAmount);
              }
              this.tickSinceUpdate = 0;
            }
            else
              this.tickSinceUpdate++;
          }
        }
      }
      if (Game.time % UPDATETIME == 0) {
        let changed = this.filterReactions();
        console.log("Labmaster analyze the labs", changed);
        if (changed) {//so rare that we update everything
          this.updateLabInfo();
          this.distibuteReactions();
          this.resourceRequests();
        }
      }
    }
    catch (e) {
      console.log("failed lab run", e);
    }
  }

  private filterReactions(): boolean {//this one fails to keep already runnning reactions that still are below the full threshold. 
    this.countResources();

    let newList = this.reactionsToAdd;
    for (let react of reactionsWanted) {
      if (react.global / 2 + react.perRoom * this.colLabs.length > (this.resources[react.r.r] | 0)) {
        let already = this.reactionsToAdd.find((tmp) => { return tmp.r.r == react.r.r; });
        if (already == null) {
          newList.push(react);
          console.log("rebotet reaction", react.r.r);
        }
      }
      console.log("reaction", react.r.r, "wants/have", react.global + react.perRoom * this.colLabs.length, this.resources[react.r.r]);
    }

    newList = _.filter(newList, (react) => {
      return react.global + react.perRoom * this.colLabs.length > (this.resources[react.r.r] | 0);
    });
    let diff = newList != this.reactionsToAdd;
    console.log("any changes?", diff);
    if (newList != this.reactionsToAdd) {
      this.reactionsToAdd = newList;
      return true;
    }
    return false;
  }

  private countResources() {
    this.resources = {};
    for (let col in this.colonies) {
      let colony = this.colonies[col];
      let storage = colony.room.storage;
      let terminal = colony.room.terminal;
      if (storage && terminal) {
        let keys = Object.keys(storage.store)
        for (let key of keys) {
          this.resources[key] = (this.resources[key] | 0) + storage.store[key as ResourceConstant];
        }
        let tKeys = Object.keys(terminal.store);
        for (let key of tKeys) {
          this.resources[key] = (this.resources[key] | 0) + terminal.store[key as ResourceConstant];
        }
      }
    }
    console.log("Global Res",JSON.stringify(this.resources));
  }

  private resourceResetLab(colony: Colony, lab: StructureLab, res: ResourceConstant | null, created: boolean) {
    let resHandler = colony.resourceHandler;
    if (resHandler.resourcePush[lab.id] != null)
      return;

    let key = _.find(Object.keys(lab.store), (key) => { return key != RESOURCE_ENERGY && (key != res || res == null); });
    if (key) {
      if (resHandler.resourcePush[lab.id] == null) {
        resHandler.resourcePush[lab.id] = new resourceRequest(lab.id, key as ResourceConstant, 0, 0, resHandler.room);
        console.log(colony.name, "push wrong resource from lab", key);
      }
      return;
    }

    if (res != null) {
      if (created) {
        if (lab.store[res] >= 2000 && resHandler.resourcePush[lab.id] == null) {
          resHandler.resourcePush[lab.id] = new resourceRequest(lab.id, res, 1000, 0, resHandler.room);
          console.log(colony.name, "push created resource from lab", res);
        }
      }
      else {
        colony.resourceExternal.push(res);
        if (lab.store[res] < 200 && resHandler.getReq(lab.id, res) == null) {
          resHandler.addRequest(new resourceRequest(lab.id, res, 200, 800, resHandler.room));
          //console.log(colony.name, "request resource to lab", res, lab.store[res]);
        }
      }
    }
    return;
  }

  private resourceRequests() {//this code coulb maybe be simplified with lab memories instead.
    for (let colLab of this.colLabs) {
      let colony = this.colonies[colLab.colony];
      colony.resourceExternal = [];
      let labs = this.colonies[colLab.colony].labs;
      for (let lab of labs) {
        if (lab.memory.state == REACTION || lab.memory.state == REACTREGENT) {//only want to reset reaction labs not boost labs
          this.resourceResetLab(colony, lab, lab.memory.resource as ResourceConstant, lab.memory.state == REACTION);
        }
        else if (lab.memory.state == null) {
          this.resourceResetLab(colony, lab, null, false);
        }
      }
    }
  }

  private updateLabInfo() {//maybe run distributeReaction when nrLabs change alot and reactions left to distribute
    this.colLabs = [];
    this.nrLabs = 0;
    for (let col in this.colonies) {
      let colony = this.colonies[col];
      let foundCol = _.find(this.colLabs, (colL) => { return colL.colony == col; });
      if (foundCol == null)
        this.colLabs.push({ nrLabs: colony.labs.length, nrLabUsed: 0, colony: col, roomReaction: [] });
      else
        foundCol.nrLabs = colony.labs.length;
      this.nrLabs += colony.labs.length;
    }
    this.colLabs.sort(function (obj1, obj2) { return obj2.nrLabs - obj1.nrLabs });
  }

  private getFreeLabIndex(labInfo: IRoomLabs, nr: number, type: LabStates, res: ResourceConstant, parentNumbers: number[]) {
    let ret: number[] = [];
    let usedHash: boolean[]= Array<boolean>(10);
    usedHash.fill(false);
    for (let pN of parentNumbers) {
      usedHash[pN] = true;
    }
    let colony = this.colonies[labInfo.colony];
    for (let lab of colony.labs) {
      //if length 0 then no conflict will happen
      let conflictingLabs = parentNumbers.length == 0 || !(((lab.memory.Index == 5 || lab.memory.Index == 8) && usedHash[2]) || ((lab.memory.Index == 7 || lab.memory.Index == 9) && usedHash[0]));
      let allowedFor5 = nr < 5 || (lab.memory.Index != 3 && lab.memory.Index != 4);
      if (!lab.memory.state && conflictingLabs && allowedFor5) {
        ret.push(lab.memory.Index);
        lab.memory.state = type;
        lab.memory.resource = res;
        if (ret.length == nr)
          break;
      }
      
    }
    if (ret.length != nr) {
      console.log("got wrong amount of free labs", nr, type, res, parentNumbers);
      throw "got wrong amount of free labs";
    }
    labInfo.nrLabUsed += ret.length;
    return ret;
  }

  recuAddReact(parentIdx: number[], minReq: MineralReq, labInfo: IRoomLabs, reactionsToAdd: MineralReq[], reserved: number): labGroup {
    let reaction = minReq.r;
    let nrLabs: number = 0;
    if (reaction.needs.length > 0) {//otherwise its an base resource
      nrLabs = Math.ceil(minReq.reactPerTic * REACTION_TIME_TYPED[reaction.r]);
    }
    if (this.resources[minReq.r.r] > UPDATETIME * 10 && nrLabs > 0 && minReq.autoAdded) {
      nrLabs = 0;
      console.log(minReq.r.r, "was not added due to big supply", this.resources[minReq.r.r]);
    }

    if (nrLabs && (labInfo.nrLabUsed + nrLabs + 2 + reserved) <= labInfo.nrLabs - 1) {
      let master: labGroup = { idxs: this.getFreeLabIndex(labInfo, nrLabs, REACTION, reaction.r, parentIdx), final: parentIdx.length == 0 };
      let masterReq: ResourceConstant = minReq.masterReq ? minReq.masterReq : reaction.r;
      let slave1 = this.recuAddReact(master.idxs, { r: REACTION_CHAIN[reaction.needs[0]], reactPerTic: minReq.reactPerTic, autoAdded: true, masterReq: masterReq }, labInfo, reactionsToAdd, reserved + 1);
      let slave2 = this.recuAddReact(master.idxs, { r: REACTION_CHAIN[reaction.needs[1]], reactPerTic: minReq.reactPerTic, autoAdded: true, masterReq: masterReq}, labInfo, reactionsToAdd, reserved);
      labInfo.roomReaction.push({ react: reaction, result: master, res1: slave1, res2: slave2 });
      console.log(labInfo.colony,'pushed reaction', reaction.r, "M", JSON.stringify(master), "S1", JSON.stringify(slave1), "S2", JSON.stringify(slave2));
      return master;
    }
    else {
      if (nrLabs) {
          let found = reactionsToAdd.find((e) => { return e.r.r == minReq.r.r })
          if (found) {
            found.reactPerTic += minReq.reactPerTic;
            //console.log("found and updated earlier res", found.r.r);
          }
          else {
            reactionsToAdd.push(minReq);//because the other room will use the same nr lab calculation as a start
          }
      }
      console.log(labInfo.colony,'added reagent', reaction.r);
      return { idxs: this.getFreeLabIndex(labInfo, 1, REACTREGENT, reaction.r, parentIdx), final: false };
      
    }
  }

  private AddReactionMult(minReq: MineralReq, labInfo: IRoomLabs, reactionsToAdd: MineralReq[]): number {
    if ((labInfo.nrLabUsed > 1 && minReq.r.r == "G") /*|| (this.resources[reaction.r] |0) > 2000 if 4 room have 500 they will never send it to this room. Need a way to empty rooms that are not producing even when below 1k limit*/)//G will never fit in a used room and needed as a pure mineral
      return 0;
    let nrLabs = minReq.reactPerTic * REACTION_TIME_TYPED[minReq.r.r];
    //console.log("in addreaction, nrLab,nrLab used, total nr labs, reaction", nrLabs, labInfo.nrLabUsed, labInfo.nrLabs, minReq.r)
    if (nrLabs > 7) {
      nrLabs = labInfo.nrLabs - 3 - labInfo.nrLabUsed;// Max possible is still 7 if we want to boost
      console.log('more than 7 not possible, reducing to', nrLabs, ', should push to reactions to add');
    }

    if (nrLabs + labInfo.nrLabUsed < labInfo.nrLabs) {//if its to big for this room
      let main = this.recuAddReact([], { r: minReq.r, reactPerTic: nrLabs / REACTION_TIME_TYPED[minReq.r.r], autoAdded: minReq.autoAdded, masterReq: null }, labInfo, reactionsToAdd, 0);
      
      return main.idxs.length / REACTION_TIME_TYPED[minReq.r.r];
    }
    else
      return 0;
  }

  private availLabs(labInfo: IRoomLabs) {
    let availLab = this.colonies[labInfo.colony].labs.length;
    for (let lab of this.colonies[labInfo.colony].labs) {
      if (lab.memory.state == REACTION || lab.memory.state == REACTREGENT) {
        lab.memory.state = null;
      }
    }

    return availLab;
  }

  
  private distibuteReactions() {
    let minReq: MineralReq[] = [];
    for (let GlobReq of this.reactionsToAdd) {
      let reactT = REACTION_TIME_TYPED[GlobReq.r.r];
      let nrLabs = Math.ceil(GlobReq.perTick * this.colLabs.length * reactT / 5);//even out the reactions to the top level such that they can work full time
      minReq.push({ r: GlobReq.r, reactPerTic: nrLabs / reactT, autoAdded: false, masterReq : null });
    }
    let labsUsed = 0
    if (this.colLabs.length >= 3) {//this is outdated, for G we needed atleast 3 rooms with 3 labs. But LH are beneficial at one col with 3 labs 
      for (let labInfo of this.colLabs) {

        labInfo.nrLabs = this.availLabs(labInfo);//because we reset react everytime we can run this code

        //console.log(labInfo.colony, 'nrLabUsed', labInfo.nrLabUsed, labInfo.nrLabs);
        while (minReq.length > 0 && labInfo.nrLabUsed + 3 <= labInfo.nrLabs) {
          try {
            let reactAdd = this.AddReactionMult(minReq[0], labInfo, minReq);
            //console.log("added reaction power of", reactAdd, "before", minReq[0].reactPerTic);
            minReq[0].reactPerTic -= reactAdd;
            if (minReq[0].reactPerTic < 0.000001) {
              console.log("remove,", minReq[0].r.r);
              minReq.shift();
            }
            else break;
          }
          catch (e) {
            console.log(labInfo.colony, 'failed reaction distribution', e, "sent in", minReq[0].r, labInfo.nrLabUsed);
          }
        }
        //minReq = minReq.concat(localReactionToAdd);
        labsUsed += labInfo.nrLabUsed;
        console.log(labInfo.colony, "total reaction added", labInfo.roomReaction.length, "left to add", minReq.length, JSON.stringify(minReq), "used labs", labInfo.nrLabUsed, "of", labInfo.nrLabs);

        if (minReq.length == 0)
          return;
      }
    }
    if (minReq.length > 0) {
      console.log("Failed to place", JSON.stringify(minReq), "used", labsUsed, "of", this.nrLabs);
    }
    else
      console.log("labs used", labsUsed, "of", this.nrLabs)
  }
}
profiler.registerClass(LabMaster, 'LabMaster');
