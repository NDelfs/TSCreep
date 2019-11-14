// example declaration file - remove these and add your own custom typings
// memory extension samples
type TargetConstant =
    | CONTROLLER
    | POWERUSER
    | POWERSTORAGE
    | SOURCE
    | DROPPED_ENERGY
    | DROPPED_MINERAL
    | CONSTRUCTION
    | REPAIR
    | POSITION
    | FLAG_RED
    | FLAG_WHITE
    | DEFEND;

type TargetEnergy =
    | SOURCE
    | DROPPED_ENERGY;

type CONTROLLER = 1;
type POWERUSER = 11;
type POWERSTORAGE = 12;
type SOURCE = 21;
type DROPPED_ENERGY = 31;
type DROPPED_MINERAL = 35;
type CONSTRUCTION = 41;
type REPAIR = 45;
type POSITION = 51;
type DEFEND = 61
type FLAG_RED = 100;
type FLAG_WHITE = 190;

type CreepConstant =
    | STARTER
    | HARVESTER
    | UPGRADER
    | TRANSPORTER
    | BUILDER
    | SCOUT
    | DEFENDER
    | ATTACKER
    | ATTACKERCONTROLLER;

type STARTER = 1;
type HARVESTER = 11;
type UPGRADER = 21;
type TRANSPORTER = 31;
type BUILDER = 41;
type SCOUT = 51;
type DEFENDER = 61
type ATTACKER = 71;
type ATTACKERCONTROLLER = 75;



interface posData {
    /**
     * The name of the room.
     */
    roomName: string;
    /**
     * X position in the room.
     */
    x: number;
    /**
     * Y position in the room.
     */
    y: number;
}

interface moveData {
    pos: posData;
    range: number;
}

interface targetData {
    ID: string;
    type: TargetConstant;
    pos: posData;
    range: number;
}

interface queData {
    memory: CreepMemory;
    body: BodyPartConstant[];
}



// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
