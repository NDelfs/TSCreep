import * as creepT from "Types/CreepType";

export function PrettyPrintErr(iErr: number): string {
    switch (iErr) {
        case 0: return "OK";
        case -1: return "ERR_NOT_OWNER";
        case -2: return "ERR_NO_PATH";
        case -3: return "ERR_NAME_EXISTS";
        case -4: return "ERR_BUSY";
        case -5: return "ERR_NOT_FOUND";
        case -6: return "ERR_NOT_ENOUGH_RESOURCES / ENERGY";
        case -7: return "ERR_INVALID_TARGET";
        case -8: return "ERR_FULL";
        case -9: return "ERR_NOT_IN_RANGE";
        case -10: return "ERR_INVALID_ARGS";
        case -11: return "ERR_TIRED";
        case -12: return "ERR_NO_BODYPART";
        case -13: return "";
        case -14: return "ERR_RCL_NOT_ENOUGH";
        case -15: return "ERR_GCL_NOT_ENOUGH";
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
    }
}
