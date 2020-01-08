// example declaration file - remove these and add your own custom typings
// memory extension samples
type TargetConstant =
  | CONTROLLER
  | POWERUSER
  | POWERSTORAGE
  | TRANSPORT
  | SOURCE
  | DROPPED_RESOURCE
  | STORAGE_RESOURCE
  | TRANSPORT_PICKUP
  | CONSTRUCTION
  | REPAIR
  | REPAIR_WALL
  | POSITION
  | FLAG_RED
  | FLAG_WHITE
  | DEFEND
  | BOOST
  | UNBOOST
  | ATTACK_STRUCTURE
  | ATTACK_CONTROLLER;

type CONTROLLER = 1;
type POWERUSER = 11;
type POWERSTORAGE = 12;
type TRANSPORT = 15;
type SOURCE = 21;
type DROPPED_RESOURCE = 31;
type STORAGE_RESOURCE = 32;
type TRANSPORT_PICKUP = 35;
type CONSTRUCTION = 41;
type REPAIR = 45;
type REPAIR_WALL = 46;
type POSITION = 51;
type DEFEND = 61;
type BOOST = 71;
type UNBOOST = 75;
type FLAG_RED = 100;
type FLAG_WHITE = 190;
type ATTACK_STRUCTURE = 200;
type ATTACK_CONTROLLER = 201;

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
type DEFENDER = 61; //all the military types could get into one
type ATTACKER = 71;
type ATTACKERCONTROLLER = 75;


type LabStates =
  | null
  | BOOSTING
  | UNBOSTING
  | REACTION
  ;

type BOOSTING = 1;
type UNBOSTING = 2;
type REACTION = 10;

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
  resType?: ResourceConstant;
  pos: posData;
  range: number;
  targetVal?: number;//on repair wall
}

interface queData {
  memory: CreepMemory;
  body: BodyPartConstant[];
  prio: number;//low is important
  eTresh: number;//min energy to build, 1 is full
}

interface flagColors {
  first: ColorConstant;
  second: ColorConstant;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
