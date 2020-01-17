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

interface MineralReq {
  r: IReaction;
  perRoom: number; //total goal would then be nrRoom*perRoom + global
  global: number;
  perTick: number; //expected tick rate per room
}

const REACTION_TIME_TYPED = REACTION_TIME as { [react: string]: number };

const reactionsWanted: { r: IReaction, perRoom: number, global: number, perTick: number }[] = [//half global init a restart of prod
  { r: REACTION_CHAIN["G"], perRoom: 0, global: 2e4, perTick: 0.1 },//keep some for nukes and GH
  { r: REACTION_CHAIN["LH"], perRoom: 2000, global: 5000, perTick: 0.06 },//cheap boost for building
  { r: REACTION_CHAIN["UO"], perRoom: 2000, global: 5000, perTick: 0.1 }
  /*, REACTION_CHAIN["XGH2O"]*/
];

export class LabMaster {
  colonies: { [name: string]: Colony };
  colLabs: IRoomLabs[];
  nrLabs: number;
  resources: { [name: string]: number };
  reactionsToAdd: MineralReq[];

  constructor(iColonies: { [name: string]: Colony }) {
    this.colonies = iColonies;
    this.reactionsToAdd = reactionsWanted;
    this.resources = {};
    this.colLabs = [];
    this.nrLabs = 0;
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
          for (let i = 0; i < react.result.idxs.length; i++) {
          //for (let mainIdx of react.result.idxs) {
            let main0 = colony.labs[react.result.idxs[i]];
            let first = colony.labs[this.getSlaveLab(colony, react.res1,react,i)];
            let firstAmount = first.store[react.react.needs[0]];
            let second = colony.labs[this.getSlaveLab(colony, react.res2, react, i)];
            let secondAmount = second.store[react.react.needs[1]];
            console.log(colony.name, 'run reaction between', main0.memory.Index,"and", first.memory.Index, second.memory.Index);
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

            if (Game.time % 100 == 0) {
              if (firstAmount < 200 && resHandler.getReq(first.id, react.react.needs[0]) == null) {
                resHandler.addRequest(new resourceRequest(first.id, react.react.needs[0], 200, 800, colony.room));
                console.log(colony.name, "request resource to lab", react.react.needs[0], firstAmount);
              }
              if (secondAmount < 200 && resHandler.getReq(second.id, react.react.needs[1]) == null) {
                resHandler.addRequest(new resourceRequest(second.id, react.react.needs[1], 200, 800, colony.room));
                console.log(colony.name, "request resource to lab", react.react.needs[1], secondAmount);
              }
            }
          }
        }
      }
      if (Game.time % 1000 == 0) {
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
          console.log(colony.name, "request resource to lab", res, lab.store[res]);
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
      //let usedLabs: boolean[] = Array(labs.length).fill(false);
      //for (let reaction of colLab.roomReaction) {
      //  for (let idx of reaction.result.idxs) {
      //    this.resourceResetLab(colony, labs[idx], reaction.react.r, true);
      //    usedLabs[idx] = true;
      //  }
      //  this.resourceResetLab(colony, labs[reaction.res1.idx], reaction.react.needs[0], !reaction.res1.bring);
      //  usedLabs[reaction.res1.idx] = true;
      //  this.resourceResetLab(colony, labs[reaction.res2.idx], reaction.react.needs[1], !reaction.res2.bring);
      //  usedLabs[reaction.res2.idx] = true;
      //}
      //for (let i = 0; i < usedLabs.length; i++) {
      //  if (!usedLabs[i] && colony.memory.labMemories[i].state == null) {
      //    this.resourceResetLab(colony, labs[i], null, false);
      //  }
      //}
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



  //private AddReaction(mainIdx: number, reaction: IReaction, labInfo: IRoomLabs, reactionsToAdd: MineralReq[], finalP: boolean): boolean {
  //  if (reaction.needs.length == 0 || (mainIdx != 0 && reaction.r == "G") /*|| (this.resources[reaction.r] |0) > 2000 if 4 room have 500 they will never send it to this room. Need a way to empty rooms that are not producing even when below 1k limit*/)//G will never fit in a used room and needed as a pure mineral
  //    return false;
  //  if (labInfo.nrLabUsed + 2 <= labInfo.nrLabs) {
  //    let master = { idxs: [mainIdx], final: finalP };
  //    let slave1 = { idx: [labInfo.nrLabUsed], bring: true };
  //    let slave2 = { idx: [labInfo.nrLabUsed + 1], bring: true };
  //    labInfo.nrLabUsed += 2;
  //    slave2.bring = !this.AddReaction(slave2.idx[0], REACTION_CHAIN[reaction.needs[1]], labInfo, reactionsToAdd, false);
  //    slave1.bring = !this.AddReaction(slave1.idx[0], REACTION_CHAIN[reaction.needs[0]], labInfo, reactionsToAdd, false);
  //    labInfo.roomReaction.push({ react: reaction, result: master, res1: slave1, res2: slave2 });
  //    console.log(labInfo.colony, "Added", reaction.r, "with slaves", slave1.idx, slave1.bring, slave2.idx, slave2.bring);
  //    return true;
  //  }
  //  else {
  //    reactionsToAdd.push({ r: reaction, perRoom: 0, global: 3000, perTick: 0 });
  //    return false;
  //  }
  //}

  private getFreeLabIndex(labInfo: IRoomLabs, nr: number, type: LabStates, res: ResourceConstant, parentNumbers: number[]) {
    let ret: number[] = [];
    let usedHash: boolean[]= Array<boolean>(10);
    usedHash.fill(false);
    for (let pN of parentNumbers) {
      usedHash[pN] = true;
    }

    let colony = this.colonies[labInfo.colony];
    for (let lab of colony.labs) {
      if (!lab.memory.state && ((lab.memory.Index == 5 || lab.memory.Index == 8) && usedHash[2]) || ((lab.memory.Index == 7 || lab.memory.Index == 9) && usedHash[0])) {
        ret.push(lab.memory.Index);
        lab.memory.state = type;
        lab.memory.resource = res;
        if (ret.length == nr)
          break;
      }
      
    }
    labInfo.nrLabUsed += ret.length;
    return ret;
  }

  recuAddReact(parentIdx: number[], parentReactionPerTick: number, reaction: IReaction, labInfo: IRoomLabs, reactionsToAdd: MineralReq[]): labGroup {
    let nrLabs: number = 0;
    if (REACTION_CHAIN[reaction.needs[0]].needs.length>0) {//otherwise its an base resource
      nrLabs = Math.ceil(parentReactionPerTick * REACTION_TIME_TYPED[reaction.needs[0]]);
    }
    if (nrLabs && (labInfo.nrLabUsed + nrLabs + 2) <= labInfo.nrLabs - 1) {
      let master: labGroup = { idxs: this.getFreeLabIndex(labInfo, nrLabs, REACTION, reaction.r, parentIdx), final: parentIdx.length == 0 };
      let slave1 = this.recuAddReact(master.idxs, parentReactionPerTick, REACTION_CHAIN[reaction.needs[0]], labInfo, reactionsToAdd);
      let slave2 = this.recuAddReact(master.idxs, parentReactionPerTick, REACTION_CHAIN[reaction.needs[1]], labInfo, reactionsToAdd);
      labInfo.roomReaction.push({ react: reaction, result: master, res1: slave1, res2: slave2 });
      return master;
    }
    else {
      if (nrLabs)
        reactionsToAdd.push({ r: REACTION_CHAIN[reaction.needs[0]], perRoom: 0, global: 3000, perTick: parentReactionPerTick * 5 / this.colLabs.length });//because the other room will use the same nr lab calculation as a start
      return { idxs: this.getFreeLabIndex(labInfo, 1, REACTREGENT, reaction.r, parentIdx), final: false };
    }
  }

  private AddReactionMult(minReq: MineralReq, labInfo: IRoomLabs, reactionsToAdd: MineralReq[]): boolean {
    let reaction = minReq.r;
    if ((labInfo.nrLabUsed>1 && reaction.r == "G") /*|| (this.resources[reaction.r] |0) > 2000 if 4 room have 500 they will never send it to this room. Need a way to empty rooms that are not producing even when below 1k limit*/)//G will never fit in a used room and needed as a pure mineral
      return false;
    let reactT = REACTION_TIME_TYPED[reaction.r];
    let nrLabs = Math.ceil(minReq.perTick * this.colLabs.length * reactT / 5);//even out the reactions to the top level such that they can work full time
    if (nrLabs > 4) {
      console.log("more than for is not possible with auto assignment, should use speacial case");
      //exception from the rule using lab 3 and 4 as resource for all and only when nrLabUsed == 0;
      nrLabs = 4;
    }
    if (nrLabs + labInfo.nrLabUsed < labInfo.nrLabs) {//if its to big for this room
      let reactionPerTic = nrLabs / reactT;
      this.recuAddReact([], reactionPerTic, reaction, labInfo, reactionsToAdd);
      return true;
    }
    else
      return false;
  }

  private availLabs(labInfo: IRoomLabs) {
    let availLab = 0;
    for (let lab of this.colonies[labInfo.colony].labs) {
      if (lab.memory.state == REACTION || lab.memory.state == REACTREGENT) {
        lab.memory.state = null;
      }
      //instead we always keep last free for boost
      //if (lab.memory.state == null)//avoid using the last ones if they are already used for boost
      //  availLab++;
      //else
      //  break;
    }

    return availLab;
  }

  private distibuteReactions() {
    if (this.colLabs.length >= 3) {//this is outdated, for G we needed atleast 3 rooms with 3 labs. But LH are beneficial at one col with 3 labs 
      for (let labInfo of this.colLabs) {

        labInfo.nrLabs = this.availLabs(labInfo);//because we reset react everytime we can run this code

        let localReactionToAdd: MineralReq[] = [];
        while (this.reactionsToAdd.length > 0 && labInfo.nrLabUsed + 3 <= labInfo.nrLabs) {
          labInfo.nrLabUsed += 1;
          let rect = this.reactionsToAdd[0];

          if (this.AddReactionMult(rect, labInfo, localReactionToAdd))
            this.reactionsToAdd.shift();
        }
        this.reactionsToAdd = localReactionToAdd.concat(this.reactionsToAdd);
        //if (labInfo.roomReaction.length > 0)
        console.log(labInfo.colony, "total reaction added", labInfo.roomReaction.length, "left to add", this.reactionsToAdd.length);

        //for (let react of labInfo.roomReaction) {//because we reset react we need to claim the labs
        //  for (let idx of react.result.idxs)
        //    this.colonies[labInfo.colony].memory.labMemories[idx].state = REACTION;
        //  this.colonies[labInfo.colony].memory.labMemories[react.res1.idx].state = REACTION;
        //  this.colonies[labInfo.colony].memory.labMemories[react.res2.idx].state = REACTION;
        //}

        if (this.reactionsToAdd.length == 0)
          return;
      }
    }
  }
}
profiler.registerClass(LabMaster, 'LabMaster');
