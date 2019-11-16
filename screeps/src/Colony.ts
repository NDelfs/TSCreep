import * as Mem from "Memory";
import { profile } from "profiler/decorator";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

const ColonyMemoryDef: ColonyMemory = {
    outposts: [],
}

//@profile
export class Colony {
    memory: ColonyMemory;
    name: string;
    room: Room;
    outpostIDs: string[];//all rooms ids;
    outposts: Room[];
    controller: StructureController;

    repairSites: string[];
    constructor(iRoom: Room) {
        if (!Memory.ColonyMem)//this is rare enough that I do ugly fix here
            Memory.ColonyMem = {};

        this.room = iRoom;
        this.name = iRoom.name;
        this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
        global[this.name] = this;
        global[this.name.toLowerCase()] = this;
        console.log("recreate obj");
        this.outpostIDs = this.memory.outposts;
        this.controller = this.room.controller!;
        this.repairSites = [];
        this.computeLists(true);
        this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    }

    public refresh() {
        this.room = Game.rooms[this.name];
        this.computeLists();
    }


    private computeLists(force?:boolean){
        try {
            if (Game.time % 100 == 0 || force) {
                let controller = this.controller;
                let structs = _.filter(this.room.structures, function (struct: Structure) {
                    return (struct.hits < controller.level * 100000) && (struct.hits < struct.hitsMax - 1000);
                });
                structs.sort(function (obj: Structure, obj2: Structure): number { return obj.hits - obj2.hits; });
                for (let struct of structs) {
                    this.repairSites.push(struct.id);
                }
            }
        } catch (e) { console.log(this.name, "failed repairSites", e); };
    }
}
profiler.registerClass(Colony, 'Colony');
