import { Colony } from "Colony"
import { findAndBuildLab } from "Base/BaseExpansion"

interface IReaction {
    r: string,
    needs: string[],
    reacts?: string[],
}

interface IRoomReactions {
    react: IReaction,
    resultIdx: number,
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
    G: { r: "G", needs: ["ZK", "UL"], reacts: ["GO", "GH"] },
    GO: { r: "GO", needs: ["G", "O"], reacts: ["GHO2"] },
    GH: { r: "GH", needs: ["G", "H"], reacts: ["GH2O"] },
    GH2O: { r: "GH2O", needs: ["GH", "OH"], reacts: ["XGH2O"] },
    GHO2: { r: "GHO2", needs: ["GO", "OH"], reacts: ["XGHO2"] },
    XGH2O: { r: "XGH2O", needs: ["GH2O", "X"] },
    XGHO2: { r: "XGHO2", needs: ["GHO2", "X"] },
    OH: { r: "OH", needs: ["O", "H"], reacts: ["UH2O", "UHO2", "ZH2O", "ZHO2", "KH2O", "KHO2", "LH2O", "LHO2", "GH2O", "GHO2"] },
    Z: { r: "Z", needs: [] },
    K: { r: "K", needs: [] },
    U: { r: "U", needs: [] },
    L: { r: "L", needs: [] },
    H: { r: "H", needs: [] },
    O: { r: "O", needs: [] },
    X: { r: "X", needs: [] },
}

export class LabMaster {
    colonies: { [name: string]: Colony };
    colLabs: IRoomLabs[];
    nrLabs: number;
    resources: { [name: string]: number };
    reactionsToAdd: IReaction[];

    constructor(iColonies: { [name: string]: Colony }) {
        this.colonies = iColonies;
        this.reactionsToAdd = [REACTION_CHAIN["G"], REACTION_CHAIN["XGH2O"]];
        this.resources = {};
        this.colLabs = [];
        this.nrLabs = 0;
        try {
            this.countResources();
            this.updateLabInfo();
            this.distibuteReactions();
            this.resourceRequests();
        } catch(e) {
            console.log("failed lab construction", e);
        }
    };

    run() {
        try {
            
        }
        catch (e) {
            console.log("failed lab run", e);
        }
    }

    private countResources() {
        for (let col in this.colonies) {
            let colony = this.colonies[col];
            let storage = colony.room.storage;
            if (storage) {
                let keys = Object.keys(storage)
                for (let key of keys) {
                    this.resources[key] = (this.resources[key] | 0) + storage.store[key as ResourceConstant];
                }
            }
        }
    }

    private resourceRequests() {
        ,,,
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

    private AddReaction(mainIdx: number, reaction: IReaction, labInfo: IRoomLabs, reactionsToAdd: IReaction[]): boolean {
        if (reaction.needs.length == 0 || (mainIdx != 0 && reaction.r == "G"))//G will never fit in a room and needed as a pure mineral
            return false;
        if (labInfo.nrLabUsed + 2 <= labInfo.nrLabs) {
            let slave1 = { idx: labInfo.nrLabUsed, bring: true };
            let slave2 = { idx: labInfo.nrLabUsed + 1, bring: true };
            labInfo.nrLabUsed += 2;
            slave2.bring = !this.AddReaction(slave2.idx, REACTION_CHAIN[reaction.needs[1]], labInfo, reactionsToAdd);
            slave1.bring = !this.AddReaction(slave1.idx, REACTION_CHAIN[reaction.needs[0]], labInfo, reactionsToAdd);
            labInfo.roomReaction.push({ react: reaction, resultIdx: mainIdx, res1: slave1, res2: slave2 });
            console.log(labInfo.colony, "Added", reaction.r, "with slaves", slave1.idx, slave1.bring, slave2.idx, slave2.bring);
            return true;
        }
        else {
            reactionsToAdd.push(reaction);
            return false;
        }
    }

    private distibuteReactions() {
        if (this.colLabs.length >= 3) {
            for (let labInfo of this.colLabs) {
                let localReactionToAdd: IReaction[] = [];
                while (this.reactionsToAdd.length > 0 && labInfo.nrLabUsed + 3 <= labInfo.nrLabs) {
                    labInfo.nrLabUsed += 1;
                    let rect = this.reactionsToAdd.shift();
                    this.AddReaction(labInfo.nrLabUsed - 1, rect!, labInfo, localReactionToAdd);
                }
                this.reactionsToAdd = localReactionToAdd.concat(this.reactionsToAdd);
                if (labInfo.roomReaction.length > 0)
                    console.log(labInfo.colony, "total reaction added", labInfo.roomReaction.length, "left to add", this.reactionsToAdd.length);
            }
        }
    }
}
