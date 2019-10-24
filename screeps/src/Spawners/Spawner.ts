import { PrettyPrintErr, PrettyPrintCreep } from "../utils/PrettyPrintErr";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";

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
    if (room.energyCapacityAvailable >= 550)
        body = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE,MOVE];
    return body;
}


function getHarvesterBody(room: Room): BodyPartConstant[]
{
    if (room.energyCapacityAvailable >= 750)
        return [WORK, WORK, WORK, WORK, WORK,CARRY,CARRY, MOVE,MOVE,MOVE];
    if (room.energyCapacityAvailable >= 550)
        return [WORK, WORK,WORK,WORK,WORK, MOVE];
    throw ("cant get harvester body with less than 550 energy");
}

function getUpgradeBody(spawn: StructureSpawn): BodyPartConstant[] {
    let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
    return body;
}


function calculateStarterQue(room: Room, curentHarv: Creep[]): queData[]{
    let ret: queData[] = [];
    for (const source of room.memory.sourcesUsed) {
        const excist = _.filter(curentHarv, function (creep: Creep) { return creep.memory.mainTarget == source });
        const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Sources[source].workPos, range: 0 };
        const mem: CreepMemory = { type: creepT.STARTER, creationRoom: room.name, currentTarget: null, permTarget: targ, mainTarget: source };
        if (room.energyCapacityAvailable < 550) {
            if (excist.length < Memory.Sources[source].maxUser * 2)
                ret.push({ memory: mem, body: getStarterBody(room) });
        }
        else {
            if (excist.length < 4)// the old limits does not mater when harvesters excist
                ret.push({ memory: mem, body: getStarterBody(room) });
        }
    }
    return ret;
}

function calculateHarvesterQue(room: Room, allHarv: Creep[]): queData[] {
    let ret: queData[] = [];
    for (let source of room.memory.sourcesUsed) {
        const current = allHarv.find(function (creep) { return creep.memory.mainTarget == source});
        if (current == null) {
            const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Sources[source].workPos, range: 0 };
            const mem: CreepMemory = { type: creepT.HARVESTER, creationRoom: room.name, currentTarget: targ, permTarget: targ, mainTarget: "" };
            mem.mainTarget = source;
            ret.push({ memory: mem, body: getHarvesterBody(room) });
        }
    }
    return ret;
}

function calculateScoutQue(room: Room): queData[] {
    let ret: queData[] = [];
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
    for (let flag of wflags) {
        const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.currentTarget && creep.memory.currentTarget.ID == flag.name; });
        if (creeps.length == 0 && flag.room == null) {
            const targ: targetData = { ID: flag.name, type: targetT.FLAG_WHITE, pos: flag.pos, range: 0 };
            const mem: CreepMemory = { type: creepT.SCOUT, creationRoom: room.name, currentTarget: targ, permTarget: targ, mainTarget: "" };
            ret.push({ memory: mem, body: [MOVE] });
        }
    }

    return ret;
}

function calculateExpansiontQue(): queData[] {
    let ret: queData[] = [];
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
    for (let flag of wflags) {
        if (flag.room != null && flag.room.find(FIND_MY_SPAWNS).length == 0) {
            const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.creationRoom == flag.pos.roomName; });
            if (creeps.length < 4) {
                ret = calculateStarterQue(flag.room, creeps);
                if (ret.length > 0) {
                    if (flag.room.controller && !flag.room.controller.my)
                        ret[0].body = [CLAIM, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                    else
                        ret[0].body = [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                    ret[0].memory.currentTarget = { ID: "", type: targetT.POSITION, pos: flag.pos, range: 10 };
                }
            }
        }
    }
    return ret;
}

function spawnCreep(que: queData[], spawner: StructureSpawn): void {
    if (que.length > 0 && spawner.spawning == null) {
        const err = spawner.spawnCreep(que[0].body, "test1", { dryRun: true });
        if (err == OK) {
            let err = spawner.spawnCreep(que[0].body, PrettyPrintCreep(que[0].memory.type) + " " + getRandomName(), { memory: que[0].memory });
            if (err == OK) {
                console.log("spawned ", PrettyPrintCreep(que[0].memory.type));
                que.shift();
            }
            else
                console.log("failed to spawn", PrettyPrintCreep(que[0].memory.type), " due to ", PrettyPrintErr(err));
        }
    }
}

export function Spawner() {
    let starters = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.type == creepT.STARTER });
    let harvesters = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.type == creepT.HARVESTER });
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length > 0) {
            let starterQue = calculateStarterQue(room, starters);
            let harvestQue = calculateHarvesterQue(room, harvesters);
            let scoutQue = calculateScoutQue(room);
            let expQue = calculateExpansiontQue();
            for (let spawnID in spawns) {
                spawnCreep(harvestQue, spawns[spawnID]);             
                spawnCreep(starterQue, spawns[spawnID]);               
                spawnCreep(scoutQue, spawns[spawnID]);
                spawnCreep(expQue, spawns[spawnID]);
            }
        }
    }

}
