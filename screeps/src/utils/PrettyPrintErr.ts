import * as creepT from "Types/CreepType";

export function PrettyPrintErr(iErr: number): string {
    switch (iErr) {
        case 0: return "OK";
        case -1: return "NOT_OWNER";
        case -2: return "NO_PATH";
        case -3: return "NAME_EXISTS";
        case -4: return "BUSY";
        case -5: return "NOT_FOUND";
        case -6: return "NOT_ENOUGH_RESOURCES / ENERGY";
        case -7: return "INVALID_TARGET";
        case -8: return "FULL";
        case -9: return "NOT_IN_RANGE";
        case -10: return "INVALID_ARGS";
        case -11: return "TIRED";
        case -12: return "NO_BODYPART";
        case -13: return "";
        case -14: return "RCL_NOT_ENOUGH";
        case -15: return "GCL_NOT_ENOUGH";
        default: return "Err not added to print";
    }
}


export function PrettyPrintCreep(iType: CreepConstant): string {
    switch (iType) {
        case creepT.STARTER: return "starter";
        case creepT.HARVESTER: return "harvester";
        case creepT.UPGRADER: return "upgrader";
        case creepT.TRANSPORTER: return "transporter";
        case creepT.BUILDER: return "builder";
        case creepT.SCOUT: return "scout";
        case creepT.DEFENDER: return "defender";
        case creepT.ATTACKER: return "attacker";
        case creepT.ATTACKERCONTROLLER: return "attackerController";
    }
}
