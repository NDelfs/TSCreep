import { Colony, resourceRequest } from "Colony"
import { findAndBuildLab } from "Base/BaseExpansion"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

interface IReaction {
    r: ResourceConstant,
    needs: ResourceConstant[],
    reacts?: string[],
}

interface IRoomReactions {
    react: IReaction,
    result: { idxs: number[], final: boolean },
    res1: { idx: number, bring: boolean },
    res2: { idx: number, bring: boolean },
}

interface IRoomLabs {
    nrLabs: number,
    nrLabUsed: number,
    colony: string,
    roomReaction: IRoomReactions[],
}

const REACTION_CHAIN: { [name: string]: IReaction } = {
    /*....*/
    UL: { r: "UL", needs: ["U", "L"] },
    ZK: { r: "ZK", needs: ["Z", "K"] },
    G: { r: "G", needs: ["ZK", "UL"], reacts: ["GO", "GH"] },//nuclear and base min
    GO: { r: "GO", needs: ["G", "O"], reacts: ["GHO2"] },
    GH: { r: "GH", needs: ["G", "H"], reacts: ["GH2O"] },
    GH2O: { r: "GH2O", needs: ["GH", "OH"], reacts: ["XGH2O"] },
    GHO2: { r: "GHO2", needs: ["GO", "OH"], reacts: ["XGHO2"] },
    XGH2O: { r: "XGH2O", needs: ["GH2O", "X"] },
    XGHO2: { r: "XGHO2", needs: ["GHO2", "X"] },
    UO: { r: "UO", needs: ["U", "O"] },//200% harvest speed
    LH: { r: "LH", needs: ["L", "H"]},//repair/build 50%
    OH: { r: "OH", needs: ["O", "H"], reacts: ["UH2O", "UHO2", "ZH2O", "ZHO2", "KH2O", "KHO2", "LH2O", "LHO2", "GH2O", "GHO2"] },
    Z: { r: "Z", needs: [] },
    K: { r: "K", needs: [] },
    U: { r: "U", needs: [] },
    L: { r: "L", needs: [] },
    H: { r: "H", needs: [] },
    O: { r: "O", needs: [] },
    X: { r: "X", needs: [] },
}

interface MineralReq {
    r: IReaction;
    perRoom: number; //total goal would then be nrRoom*perRoom + global
    global: number;
    perTick: number; //expected tick rate per room
}

const REACTION_TIME_TYPED = REACTION_TIME as { [react: string]: number };

const reactionsWanted = [
    { r: REACTION_CHAIN["G"], perRoom: 0, global: 2e4, perTick: 0.1 },//keep some for nukes and GH
    { r: REACTION_CHAIN["LH"], perRoom: 1000, global: 5000, perTick: 0.04 }//cheap boost for building
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
            this.filterReactions();//do not care if list is changed
            this.updateLabInfo();
            this.distibuteReactions();
            this.resourceRequests();
        } catch(e) {
            console.log("failed lab construction", e);
        }
    };

    run() {
        try {
            for (let roomRun of this.colLabs) {
                let colony = this.colonies[roomRun.colony];
                for (let react of roomRun.roomReaction) {
                    let main0 = colony.labs[react.result.idxs[0]]; 
                    let first = colony.labs[react.res1.idx];
                    let firstAmount = first.store[react.react.needs[0]];                    
                    let second = colony.labs[react.res2.idx];
                    let secondAmount = second.store[react.react.needs[1]];
                    if (main0.cooldown == 0 && firstAmount != 0 && secondAmount != 0 && main0.store[react.react.r] < 2000) {
                        for (let idx of react.result.idxs) {
                            let main = colony.labs[idx]; 
                            main.runReaction(first, second);
                            if (react.result.final && main.store[react.react.r] >= 1000 && colony.resourcePush[main.id] == null) {
                                colony.resourcePush[main.id] = new resourceRequest(main.id, react.react.r, 1000, 200, colony.room);
                                console.log(colony.name, "push resource from lab", react.react.r, "final", react.result.final);
                            }
                        }
                    }
                    if (Game.time % 100 == 0) {
                        if (firstAmount < 200 && colony.resourceRequests[first.id] == null) {
                            colony.resourceRequests[first.id] = new resourceRequest(first.id, react.react.needs[0], 200, 800, colony.room);
                            console.log(colony.name, "request resource to lab", react.react.needs[0], firstAmount);
                        }
                        if (secondAmount < 200 && colony.resourceRequests[second.id] == null) {
                            colony.resourceRequests[second.id] = new resourceRequest(second.id, react.react.needs[1], 200, 800, colony.room);
                            console.log(colony.name, "request resource to lab", react.react.needs[1], secondAmount);
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

    private filterReactions(): boolean{
        this.countResources();
        for (let react of reactionsWanted) {
            console.log("reaction", react.r.r, "wants/have", react.global + react.perRoom * this.colLabs.length, this.resources[react.r.r]);
        }
        let newList = _.filter(reactionsWanted, (react) => {
            return react.global + react.perRoom * this.colLabs.length > (this.resources[react.r.r]|0);
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

    private resourceResetLab(colony: Colony, lab: StructureLab, res: ResourceConstant, created: boolean) {
        if (colony.resourcePush[lab.id] != null)
            return;

        let key = _.find(Object.keys(lab.store), (key) => { return key != RESOURCE_ENERGY && key != res; });
        if (key) {
            if (colony.resourcePush[lab.id] == null) {
                colony.resourcePush[lab.id] = new resourceRequest(lab.id, key as ResourceConstant, 0, 0, colony.room);
                console.log(colony.name, "push wrong resource from lab", key);
            }
            return;
        }

        if (created) {
            if (lab.store[res] >= 2000 && colony.resourcePush[lab.id] == null) {
                colony.resourcePush[lab.id] = new resourceRequest(lab.id, res, 1000, 0, colony.room);
                console.log(colony.name, "push created resource from lab", res);
            }
        }
        else {
            colony.resourceExternal.push(res);
            if (lab.store[res] < 200 && colony.resourceRequests[lab.id] == null) {
                colony.resourceRequests[lab.id] = new resourceRequest(lab.id, res, 200, 800, colony.room);
                console.log(colony.name, "request resource to lab", res, lab.store[res]);
            }
        }
        return;
    }

    private resourceRequests() {
        for (let colLab of this.colLabs) {
            let colony = this.colonies[colLab.colony];
            let labs = this.colonies[colLab.colony].labs;
            for (let reaction of colLab.roomReaction) {
                for (let idx of reaction.result.idxs) {
                    this.resourceResetLab(colony, labs[idx], reaction.react.r, true);
                }
                this.resourceResetLab(colony, labs[reaction.res1.idx], reaction.react.needs[0], !reaction.res1.bring);
                this.resourceResetLab(colony, labs[reaction.res2.idx], reaction.react.needs[1], !reaction.res2.bring);
            }
        }
    }

    private updateLabInfo(){//maybe run distributeReaction when nrLabs change alot and reactions left to distribute
        for (let col in this.colonies) {
            let colony = this.colonies[col];
            findAndBuildLab(colony.room, colony.labs);
            let foundCol = _.find(this.colLabs, (colL) => { return colL.colony == col; });
            if (foundCol == null)
                this.colLabs.push({ nrLabs: colony.labs.length, nrLabUsed: 0, colony: col, roomReaction: [] });
            else
                foundCol.nrLabs = colony.labs.length;
            this.nrLabs += colony.labs.length;
        }
        this.colLabs.sort(function (obj1, obj2) { return obj1.nrLabs - obj2.nrLabs });
}

    private AddReaction(mainIdx: number, reaction: IReaction, labInfo: IRoomLabs, reactionsToAdd: MineralReq[], finalP : boolean): boolean {
        if (reaction.needs.length == 0 || (mainIdx != 0 && reaction.r == "G"))//G will never fit in a used room and needed as a pure mineral
            return false;
        if (labInfo.nrLabUsed + 2 <= labInfo.nrLabs) {
            let master = { idxs: [mainIdx], final: finalP };
            let slave1 = { idx: labInfo.nrLabUsed, bring: true };
            let slave2 = { idx: labInfo.nrLabUsed + 1, bring: true };
            labInfo.nrLabUsed += 2;
            slave2.bring = !this.AddReaction(slave2.idx, REACTION_CHAIN[reaction.needs[1]], labInfo, reactionsToAdd,false);
            slave1.bring = !this.AddReaction(slave1.idx, REACTION_CHAIN[reaction.needs[0]], labInfo, reactionsToAdd,false);
            labInfo.roomReaction.push({ react: reaction, result: master, res1: slave1, res2: slave2 });
            console.log(labInfo.colony, "Added", reaction.r, "with slaves", slave1.idx, slave1.bring, slave2.idx, slave2.bring);
            return true;
        }
        else {
            reactionsToAdd.push({ r: reaction, perRoom: 0, global: 3000, perTick:0 });
            return false;
        }
    }

    private distibuteReactions() {
        if (this.colLabs.length >= 3) {
            for (let labInfo of this.colLabs) {
                let localReactionToAdd: MineralReq[] = [];
                while (this.reactionsToAdd.length > 0 && labInfo.nrLabUsed + 3 <= labInfo.nrLabs) {
                    labInfo.nrLabUsed += 1;
                    let rect = this.reactionsToAdd[0];

                    if (REACTION_CHAIN[rect.r.needs[0]].needs.length == 0, REACTION_CHAIN[rect.r.needs[1]].needs.length == 0) {
                        let reactT = REACTION_TIME_TYPED[rect.r.r];
                        let nrLabs = Math.ceil(rect.perTick * this.colLabs.length * 5 / reactT);
                        console.log("nr labs needed for ", rect.r.r, nrLabs, rect.perTick * this.colLabs.length * 5 / reactT)
                        if (nrLabs > 1) {
                            console.log("more reactors needed but not implemented");
                            if (labInfo.nrLabUsed != 1)
                                continue;

                        }

                    }

                    if (this.AddReaction(labInfo.nrLabUsed - 1, rect.r, labInfo, localReactionToAdd, true))
                      this.reactionsToAdd.shift();
                }
                this.reactionsToAdd = localReactionToAdd.concat( this.reactionsToAdd );
                if (labInfo.roomReaction.length > 0)
                    console.log(labInfo.colony, "total reaction added", labInfo.roomReaction.length, "left to add", this.reactionsToAdd.length);
            }
        }
    }
}
profiler.registerClass(LabMaster, 'LabMaster');
