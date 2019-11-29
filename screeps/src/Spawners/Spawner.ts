import { PrettyPrintErr, PrettyPrintCreep } from "../utils/PrettyPrintErr";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { CONTROLLER } from "Types/TargetTypes";
import { TRANSPORTER, HARVESTER, STARTER } from "Types/CreepType";
import { Transporter } from "../Drones/Transporter";
import { PM } from "PishiMaster";

let names1 = ["Jackson", "Aiden", "Liam", "Lucas", "Noah", "Mason", "Jayden", "Ethan", "Jacob", "Jack", "Caden", "Logan", "Benjamin", "Michael", "Caleb", "Ryan", "Alexander", "Elijah", "James", "William", "Oliver", "Connor", "Matthew", "Daniel", "Luke", "Brayden", "Jayce", "Henry", "Carter", "Dylan", "Gabriel", "Joshua", "Nicholas", "Isaac", "Owen", "Nathan", "Grayson", "Eli", "Landon", "Andrew", "Max", "Samuel", "Gavin", "Wyatt", "Christian", "Hunter", "Cameron", "Evan", "Charlie", "David", "Sebastian", "Joseph", "Dominic", "Anthony", "Colton", "John", "Tyler", "Zachary", "Thomas", "Julian", "Levi", "Adam", "Isaiah", "Alex", "Aaron", "Parker", "Cooper", "Miles", "Chase", "Muhammad", "Christopher", "Blake", "Austin", "Jordan", "Leo", "Jonathan", "Adrian", "Colin", "Hudson", "Ian", "Xavier", "Camden", "Tristan", "Carson", "Jason", "Nolan", "Riley", "Lincoln", "Brody", "Bentley", "Nathaniel", "Josiah", "Declan", "Jake", "Asher", "Jeremiah", "Cole", "Mateo", "Micah", "Elliot"]
let names2 = ["Sophia", "Emma", "Olivia", "Isabella", "Mia", "Ava", "Lily", "Zoe", "Emily", "Chloe", "Layla", "Madison", "Madelyn", "Abigail", "Aubrey", "Charlotte", "Amelia", "Ella", "Kaylee", "Avery", "Aaliyah", "Hailey", "Hannah", "Addison", "Riley", "Harper", "Aria", "Arianna", "Mackenzie", "Lila", "Evelyn", "Adalyn", "Grace", "Brooklyn", "Ellie", "Anna", "Kaitlyn", "Isabelle", "Sophie", "Scarlett", "Natalie", "Leah", "Sarah", "Nora", "Mila", "Elizabeth", "Lillian", "Kylie", "Audrey", "Lucy", "Maya", "Annabelle", "Makayla", "Gabriella", "Elena", "Victoria", "Claire", "Savannah", "Peyton", "Maria", "Alaina", "Kennedy", "Stella", "Liliana", "Allison", "Samantha", "Keira", "Alyssa", "Reagan", "Molly", "Alexandra", "Violet", "Charlie", "Julia", "Sadie", "Ruby", "Eva", "Alice", "Eliana", "Taylor", "Callie", "Penelope", "Camilla", "Bailey", "Kaelyn", "Alexis", "Kayla", "Katherine", "Sydney", "Lauren", "Jasmine", "London", "Bella", "Adeline", "Caroline", "Vivian", "Juliana", "Gianna", "Skyler", "Jordyn"]
let namesCombined = _.flatten(_.map(names1, function (v, i) { return [v, names2[i]]; }));

function getRandomName() {
    if (Memory.creepIndex >= namesCombined.length) {
        Memory.creepIndex = 0
    } else {
        Memory.creepIndex++
    }

    return namesCombined[Memory.creepIndex % namesCombined.length]
}

function getStarterBody(room: Room): BodyPartConstant[] {
    let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
    if (room.energyCapacityAvailable >= 1200) {
        body = [];
        let nrSets = room.energyCapacityAvailable * 0.8 / 200.0;
        if (nrSets > 8)
            nrSets = 8;
        for (let i = 0; i < nrSets; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
    }
    else if (room.energyCapacityAvailable >= 800)
        body = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    else if (room.energyCapacityAvailable >= 550)
        body = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
    return body;
}

function getBuilderBody(room: Room): BodyPartConstant[] {
    return getStarterBody(room);
}

function getHarvesterBody(room: Room): BodyPartConstant[]
{
    if (room.energyCapacityAvailable >= 750)
        return [WORK, WORK, WORK, WORK, WORK,CARRY,CARRY, MOVE,MOVE,MOVE];
    else if (room.energyCapacityAvailable >= 550)
        return [WORK, WORK,WORK,WORK,WORK, MOVE];
    throw ("cant get harvester body with less than 550 energy");
}

function getTransportBody(room: Room): BodyPartConstant[] {
    let nrSets = room.energyCapacityAvailable*0.8 / 150.0;
    
    let ret: BodyPartConstant[] = [];
    if (nrSets > 10)
        nrSets = 10;

    for (let i = 0; i < nrSets; i++) {
        ret.push(CARRY);
        ret.push(CARRY);
        ret.push(MOVE);
    }

    return ret;
}

function getUpgradeBody(room: Room, size: number): BodyPartConstant[] {
    switch (size) {
        case 5:
            if (room.energyCapacityAvailable >= 1800)
                return Array(15).fill(WORK).concat([CARRY,CARRY,CARRY,CARRY, MOVE, MOVE]);
                //return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
        case 4:
            if (room.energyCapacityAvailable >= 1500)
                return Array(12).fill(WORK).concat([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]);
                //return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
        case 3:
            if (room.energyCapacityAvailable >= 1250)
                return Array(10).fill(WORK).concat([CARRY, CARRY, CARRY, MOVE, MOVE]);
        case 2:
            if (room.energyCapacityAvailable >= 1050)
                return Array(8).fill(WORK).concat([CARRY, CARRY, CARRY, MOVE, MOVE]);
        case 1:
            if (room.energyCapacityAvailable >= 750)
                return Array(6).fill(WORK).concat([CARRY, MOVE, MOVE]);
    }
    //throw ("cant get upgrader body with current index");
    console.log(room.name, "cant get upgrader body with current index", size);
    return [];
}

function calculateTransportQue(room: Room): queData[] {
    let ret: queData[] = [];
    if (room.controller && room.controller.level >= 3) {
        let transportSize = (room.energyCapacityAvailable * 0.8 / 150.0)*100;
        let limit = 2;
        let roomEne = 0;
        for (let sourceID of room.memory.sourcesUsed) {
            roomEne += Memory.Resources[sourceID].AvailResource;
        }
        let controllerNeed = 0;
        if (room.memory.controllerStoreID && PM.colonies[room.name].resourceRequests[room.memory.controllerStoreID]) {
            controllerNeed = PM.colonies[room.name].resourceRequests[room.memory.controllerStoreID!].amount();
        }

        if (roomEne > transportSize * 4 && (controllerNeed > 500 || room.storage))
            limit = 3;
        if (roomEne > transportSize * 8 && (controllerNeed > 500 || room.storage))
            limit = 4;
        const creeps = room.getCreeps(creepT.TRANSPORTER);
        for (const source of room.memory.sourcesUsed) {
            //const excist = _.filter(curentHarv, function (creep: Creep) { return creep.memory.mainTarget == source });     
            if (creeps.length < limit) {
                const mem: CreepMemory = { type: creepT.TRANSPORTER, creationRoom: room.name, permTarget: null, moveTarget: null, targetQue : [] };
                ret.push({ memory: mem, body: getTransportBody(room) });
            }
        }
    }
    return ret;
}

function calculateStarterQue(room: Room): queData[]{
    let ret: queData[] = [];
    for (const source of room.memory.sourcesUsed) {
        const excist = _.filter(room.getCreeps(creepT.STARTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source});
        const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
        const mem: CreepMemory = { type: creepT.STARTER, creationRoom: room.name, permTarget: targ, moveTarget: null, targetQue: []};
        if (room.energyCapacityAvailable < 550) {
            if (excist.length < Memory.Resources[source].maxUser * 2)
                ret.push({ memory: mem, body: getStarterBody(room) });
        }
        else {
            if (room.energyCapacityAvailable < 800 && excist.length < 4)// the old limits does not mater when harvesters excist
                ret.push({ memory: mem, body: getStarterBody(room) });
            else if(room.energyCapacityAvailable >= 800 && excist.length < 3)// the old limits does not mater when harvesters excist
                ret.push({ memory: mem, body: getStarterBody(room) });
        }
    }
    return ret;
}

function calculateHarvesterQue(room: Room): queData[] {
    let ret: queData[] = [];
    if (room.energyCapacityAvailable >= 550) {
        for (let source of room.memory.sourcesUsed) {
            const current = _.filter(room.getCreeps(creepT.HARVESTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source });
            if (current.length == 0) {
                const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
                const mem: CreepMemory = {
                    type: creepT.HARVESTER, creationRoom: room.name, permTarget: targ, moveTarget: { pos: Memory.Resources[source].workPos, range: 0 }, targetQue: [targ]};
                ret.push({ memory: mem, body: getHarvesterBody(room) });
            }
        }
    }
    if (room.terminal && ret.length == 0 && room.availEnergy > 4e4) {
        for (let source of room.memory.mineralsUsed) {
            const min = Game.getObjectById(source) as Mineral | null;
            if (min && min.mineralAmount > 0) {
                const current = _.filter(room.getCreeps(creepT.HARVESTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source });
                if (current.length == 0) {
                    const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
                    const mem: CreepMemory = { type: creepT.HARVESTER, creationRoom: room.name, permTarget: targ, moveTarget: { pos: Memory.Resources[source].workPos, range: 0 }, targetQue: [targ]};
                    ret.push({ memory: mem, body: Array(16).fill(WORK).concat([MOVE, MOVE, MOVE, MOVE]) });
                }
            }
        }

    }
    return ret;
}

function calculateUpgraderQue(room: Room): queData[] {
    let ret: queData[] = [];
    if (room.controller && room.memory.controllerStoreID) {
        let store: StructureContainer | null = Game.getObjectById(room.memory.controllerStoreID);
        if (store) {
            let limit = 1;
            let size = 1;
            let roomEne = 0;
            for (let sourceID of room.memory.sourcesUsed) {
                roomEne += Memory.Resources[sourceID].AvailResource;
            }
            let controllerNeed = 0;
            if (room.memory.controllerStoreID && PM.colonies[room.name].resourceRequests[room.memory.controllerStoreID]) {
                controllerNeed = PM.colonies[room.name].resourceRequests[room.memory.controllerStoreID!].amount();
            }
   
            if (room.storage) {
                size = 2;
                if (room.storage.store.energy > 1e5)
                    size = 3;
                if (room.storage.store.energy > 2e5 && room.energyCapacityAvailable >= 1600)
                    size = 4;
                if (room.storage.store.energy > 3e5 && room.energyCapacityAvailable >= 2000)
                    size = 5;
            }
            else if (roomEne > 4000 && controllerNeed < 500) {
                limit = 2;
            }

            if (room.getCreeps(creepT.UPGRADER).length < limit) {
                const targ: targetData = { ID: room.controller.id, type: targetT.CONTROLLER, pos: store.pos, range: 1 };
                const mem: CreepMemory = { type: creepT.UPGRADER, creationRoom: room.name, permTarget: targ, moveTarget: { pos: store.pos, range: 1 }, targetQue: [targ]};
                ret.push({ memory: mem, body: getUpgradeBody(room, size) });
            }
        }      
    }
    return ret;
}

function calculateBuilderQue(room: Room): queData[] {
    let ret: queData[] = [];
    if (room.constructionSites.length > 0 && room.memory.controllerStoreID) {
        let limit = 0;
        if (room.availEnergy > 2e3)
            limit = 1;
        if (room.availEnergy > 2e4)
            limit = 2;

        if (room.getCreeps(creepT.BUILDER).length < limit) {
            const mem: CreepMemory = { type: creepT.BUILDER, creationRoom: room.name, permTarget: null, moveTarget: null, targetQue: [] };
            ret.push({ memory: mem, body: getBuilderBody(room) });
        }
    }
    return ret;
}

function calculateScoutQue(room: Room): queData[] {
    let ret: queData[] = [];
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
    for (let flag of wflags) {
        const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.SCOUT && creep.currentTarget && creep.currentTarget.ID == flag.name; });
        if (creeps.length == 0 && flag.room == null) {
            const targ: targetData = { ID: flag.name, type: targetT.CONTROLLER, pos: flag.pos, range: 1 };
            const mem: CreepMemory = { type: creepT.SCOUT, creationRoom: room.name, permTarget: null, moveTarget: { pos: flag.pos, range: 2 }, targetQue: [targ]};           
            ret.push({ memory: mem, body: [CLAIM, MOVE] });            
        }
    }
    if (room.controller && room.controller.my && room.controller.level > 2) {
        if (room.controller.sign == null || (room.controller.sign.username != "Gorgar")) {
            const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.SCOUT && creep.currentTarget && creep.currentTarget.ID == "controller"; });
            if (creeps.length == 0) {
                const targ: targetData = { ID: "controller", type: targetT.CONTROLLER, pos: room.controller.pos, range: 1 };
                const mem: CreepMemory = { type: creepT.SCOUT, creationRoom: room.name, permTarget: targ, moveTarget: { pos: room.controller.pos, range: 1 }, targetQue: [targ]  };
                ret.push({ memory: mem, body: [MOVE] });
            }
        }
    }
    return ret;
}

function calculateExpansiontQue(): queData[] {
    let ret: queData[] = [];
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
    for (let flag of wflags) {
        if (flag.room != null && (flag.room.controller == null || flag.room.controller.level < 3)) {
            //if (creeps.length < 4) {
            ret = calculateStarterQue(flag.room);

                if (ret.length > 0) {
                    ret[0].body = [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                    ret[0].memory.moveTarget = {pos: flag.pos, range: 10 };
                    return ret;
                }
            //}
        }
    }
    return ret;
}

function calculateDefQue(room: Room): queData[] {
    let ret: queData[] = [];
    if (room.getCreeps(creepT.DEFENDER).length < 2) {
        //const targ: targetData = { ID: "", type: targetT., pos: flag.pos, range: 2 };
        const mem: CreepMemory = { type: creepT.DEFENDER, creationRoom: room.name, permTarget: null, moveTarget: null, targetQue: [] };
        ret.push({ memory: mem, body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK] });  
    }
    return ret;
}

function calculateAttackQue(): queData[] {
    let ret: queData[] = [];
    let attackFlag = _.filter(Game.flags, function (flag) { return flag.color == COLOR_BLUE });
    if (attackFlag.length > 0) {
        let creeps = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.type == creepT.ATTACKER });
        if (creeps.length < 2) {
            const mem: CreepMemory = { type: creepT.ATTACKER, creationRoom: "", permTarget: null, moveTarget: { pos: attackFlag[0].pos, range: 2 }, targetQue: []};
            ret.push({ memory: mem, body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, RANGED_ATTACK] });
        }
    }
    attackFlag = _.filter(Game.flags, function (flag) { return flag.color == COLOR_CYAN });
    if (attackFlag.length > 0) {
        let creeps = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.type == creepT.ATTACKERCONTROLLER });
        if (creeps.length < 1) {
            const mem: CreepMemory = { type: creepT.ATTACKERCONTROLLER, creationRoom: "", permTarget: null, moveTarget: { pos: attackFlag[0].pos, range: 2 }, targetQue: []};
            ret.push({ memory: mem, body: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE,MOVE, CLAIM, CLAIM, CLAIM] });
        }
    }
    return ret;
}

function spawnCreep(que: queData[], spawner: StructureSpawn): number {
    if (que.length > 0 && spawner.spawning == null) {
        const err = spawner.spawnCreep(que[0].body, "test1", { dryRun: true });
        if (err == OK) {
            let err = spawner.spawnCreep(que[0].body, PrettyPrintCreep(que[0].memory.type) + " " + getRandomName(), { memory: que[0].memory });
            if (err == OK) {
                //if (que[0].memory.type == creepT.DEFENDER)
                console.log("spawned", PrettyPrintCreep(que[0].memory.type), "at", spawner.room.name);
                PM.colonies[spawner.room.name].forceUpdateEnergy = true;
                que.shift();
                spawner.room.memory.inCreepEmergency = null;      
                return 1;
            }
            else
                console.log("failed to spawn", PrettyPrintCreep(que[0].memory.type), " due to ", PrettyPrintErr(err));
        }
        else if (err != ERR_NOT_ENOUGH_ENERGY)
            console.log(spawner.room.name, "spawn failed to spawn", PrettyPrintCreep(que[0].memory.type), PrettyPrintErr(err));
    }
    return 0;
}

function isFailedEconomy(room: Room, spawns: StructureSpawn[]): void {
    if (room.memory.inCreepEmergency == null) {
        for (const spawn of spawns) {
            const spawning = spawn.spawning;
            if (spawning) {
                return;
            }
        }

        if ((room.getCreeps(HARVESTER).length > 0 && room.getCreeps(TRANSPORTER).length > 0) || room.getCreeps(STARTER).length > 1)
            return;
        if ((room.getCreeps(TRANSPORTER).length > 0 || room.getCreeps(STARTER).length > 0) && room.availEnergy > 800)
            return;
        console.log(room.name, "is in emergency");
        room.memory.inCreepEmergency = 0;
    }
}

export function Spawner() {
    //let expQue = calculateExpansiontQue();
    let attackQue = calculateAttackQue();
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        try {
            //let creepsInRoom = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.creationRoom == room.name; });
            const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
            
            if (wflags.length > 0) {
                let froom = wflags[0].room;
                if (froom) {
                    let struct = room.find(FIND_MY_CONSTRUCTION_SITES);
                    froom.memory.inCreepEmergency = 0;
                }
            }
            var spawns = room.find(FIND_MY_SPAWNS);
            if (spawns.length > 0) {
                isFailedEconomy(room, spawns);
                let starterQue: queData[] = [];
                if (room.memory.controllerStoreID == null)
                    starterQue = calculateStarterQue(room);
                let harvestQue = calculateHarvesterQue(room);
                let builderQue = calculateBuilderQue(room);
                //let scoutQue = calculateScoutQue(room);

                let TransQue = calculateTransportQue(room);
                let upgradeQue = calculateUpgraderQue(room);
                let nrNewSpawns: number = 0;

                for (let spawnID in spawns) {
                    // if (enemy.length == 0) {

                    nrNewSpawns += spawnCreep(harvestQue, spawns[spawnID]);
                    if (room.availEnergy > 800) {
                        nrNewSpawns += spawnCreep(TransQue, spawns[spawnID]);
                    }
                    nrNewSpawns += spawnCreep(starterQue, spawns[spawnID]);
                    if (room.availEnergy > 800 && room.creepsAll.length > 2) {
                        nrNewSpawns += spawnCreep(upgradeQue, spawns[spawnID]);
                        if (room.energyAvailable > room.energyCapacityAvailable * 0.9) {
                            nrNewSpawns += spawnCreep(builderQue, spawns[spawnID]);
                            //nrNewSpawns += spawnCreep(scoutQue, spawns[spawnID]);
                            //nrNewSpawns += spawnCreep(expQue, spawns[spawnID]);
                            spawnCreep(attackQue, spawns[spawnID]);
                        }
                    }
                    // }
                    //else {
                    if (room.controller && (room.hostiles.length > 0 && room.controller.level <= 3)) {
                        spawnCreep(calculateDefQue(room), spawns[spawnID]);
                    }
                }
            }
                if (room.memory.inCreepEmergency != null /*&& room.name != "E49N51"*/) {
                    let starterQue = calculateStarterQue(room);
                  
                    for (let room2ID in Game.rooms) {
                        if (room.memory.inCreepEmergency == 0 && starterQue.length >0) {
                            let room2 = Game.rooms[room2ID];
                            starterQue[0].body = getStarterBody(room2);
                            //if (room2.energyAvailable>)//need to compute cost
                            var spawns2 = room2.find(FIND_MY_SPAWNS);
                            for (let spawn2ID in spawns2) {
                                room.memory.inCreepEmergency = spawnCreep(starterQue, spawns2[spawn2ID]);
                                if (room.memory.inCreepEmergency > 0) {
                                    console.log(room.name, "Emergency build of starter remotely from", room2.name);
                                }
                            }
                        }
                       
                    }
                }

            
        }
        catch (e) {
            console.log(room.name, "failed to spawn", e);
        }
    }

}
