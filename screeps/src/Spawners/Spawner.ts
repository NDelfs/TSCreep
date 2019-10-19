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


function getHarvesterBody(spawn: StructureSpawn): BodyPartConstant[]
{
    let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
    return body;
}

function getUpgradeBody(spawn: StructureSpawn): BodyPartConstant[] {
    let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
    return body;
}


function calculateStarterQue(room: Room, curentHarv: Creep[])
{
    for (const source in room.memory.sourcesUsed) {
        const excist = _.filter(curentHarv, function (creep: Creep) { return creep.memory.mainTarget == room.memory.sourcesUsed[source] });
        if (excist.length < Memory.Sources[room.memory.sourcesUsed[source]].maxUser*2)
            room.memory.starterque.push({ room: room.name, mainTarget: room.memory.sourcesUsed[source] });
    }
}


function spawnStarter(que: harvesterQueData[], spawner: StructureSpawn) {
    if (que.length > 0 && spawner.spawning == null) {
        const body = getStarterBody(spawner);
        const mem: CreepMemory = { role: 'starter', creationRoom: que[0].room, working: true, deliver: false, currentTarget: null, mainTarget: que[0].mainTarget, targetType: "" };
        const err = spawner.spawnCreep(body, "test1", { dryRun: true });
        if (err == OK) {
            let err = spawner.spawnCreep(body, 'starter ' + getRandomName(), { memory: mem });
            if (err == OK) {
                console.log(`spawned starte`);
                que.shift();
                console.log("left in que " + que.length);
            }
            else
                console.log(`failed spawned starter {}`, err);
        }
        //else
            //console.log("could not create due to {}",  err );
    }
}


export function Spawner() {
    let starters = _.filter(Game.creeps, function (creep: Creep) { return creep.memory.role == "starter" });
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length > 0) {
            if (room.memory.starterque == null || room.memory.starterque.length == 0)
                calculateStarterQue(room, starters);
            for (let spawnID in spawns) {
                spawnStarter(room.memory.starterque, spawns[spawnID]);  
            }
        }
    }

}
