import { PrettyPrintErr, PrettyPrintCreep } from "../utils/PrettyPrintErr";
import * as creepT from "Types/CreepType";

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

function getStarterBody(spawn: StructureSpawn): BodyPartConstant[] {
    let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
    if (spawn.room.energyCapacityAvailable >= 550)
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


function calculateStarterQue(room: Room, curentHarv: Creep[]):void
{
    for (const source in room.memory.sourcesUsed) {
        const excist = _.filter(curentHarv, function (creep: Creep) { return creep.memory.mainTarget == room.memory.sourcesUsed[source] });
        if (room.energyCapacityAvailable < 550) {
            if (excist.length < Memory.Sources[room.memory.sourcesUsed[source]].maxUser * 2)
                room.memory.starterque.push({ room: room.name, mainTarget: room.memory.sourcesUsed[source] });
        }
        else {
            if (excist.length < 3)// the old limits does not mater when harvesters excist
                room.memory.starterque.push({ room: room.name, mainTarget: room.memory.sourcesUsed[source] });
        }
    }
}

function calculateHarvesterQue(room: Room, allHarv: Creep[]): queData[] {
    let ret: queData[] = [];
    const mem: CreepMemory = { type: creepT.HARVESTER, creationRoom: room.name, currentTarget: null, mainTarget: "" };
    for (let source of room.memory.sourcesUsed) {
        const current = allHarv.find(function (creep) { return creep.memory.mainTarget == source});
        if (current == null) {
            mem.mainTarget = source;
            ret.push({ memory: mem, body: getHarvesterBody(room) });
        }
    }
    return ret;
}

function spawnStarter(que: harvesterQueData[], spawner: StructureSpawn) {
    if (que.length > 0 && spawner.spawning == null) {
        const body = getStarterBody(spawner);
        const mem: CreepMemory = { type: creepT.STARTER, creationRoom: que[0].room, currentTarget: null, mainTarget: que[0].mainTarget };
        const err = spawner.spawnCreep(body, "test1", { dryRun: true });
        if (err == OK) {
            let err = spawner.spawnCreep(body, 'starter ' + getRandomName(), { memory: mem });
            if (err == OK) {
                console.log(`spawned starter`);
                que.shift();
            }
            else
                console.log(`failed spawned starter {}`, err);
        }
        //else
            //console.log("could not create due to {}",  err );
    }
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
            if (room.memory.starterque == null || room.memory.starterque.length == 0)
                calculateStarterQue(room, starters);
            let harvestQue = calculateHarvesterQue(room, harvesters);
            for (let spawnID in spawns) {
                if (harvestQue.length > 0)
                    spawnCreep(harvestQue, spawns[spawnID])
                else
                    spawnStarter(room.memory.starterque, spawns[spawnID]);  
            }
        }
    }

}
