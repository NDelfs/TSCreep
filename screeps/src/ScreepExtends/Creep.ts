import { restorePos, inRangeTo } from "../utils/posHelpers";
import { DEFENDER, Military, TRANSPORTER } from "../Types/CreepType";
import { POWERUSER } from "../Types/TargetTypes";
import {PM} from "PishiMaster";

Object.defineProperty(Creep.prototype, 'type', {
    get() {
        return this.memory.type;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'creationRoom', {
    get() {
        return this.memory.creationRoom;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'carryAmount', {
    get() {
        if (!this._carryAmount) {
            this._carryAmount = _.sum(this.carry);
        }
        return this._carryAmount;
    },
     configurable: true,
});

Object.defineProperty(Creep.prototype, 'currentTarget', {
    get() {
        //if (this.memory._currentTarget == null && this.memory.currentTarget) {
            //this.memory._currentTarget = this.memory.currentTarget;
            //this.memory.currentTarget = null;
        //}
        return this.memory._currentTarget;
    },
    set(iData: targetData) {
        if ((iData == null || iData.type != POWERUSER) && (this.memory._currentTarget /*&& this.memory._currentTarget == POWERUSER*/))
            PM.colonies[this.memory.creationRoom].removeEnergyTran(this);
        else if (((this.memory._currentTarget == null || this.memory._currentTarget != POWERUSER) && (iData && iData.type == POWERUSER))&& this.carry.energy >0)
            PM.colonies[this.memory.creationRoom].addEnergyTran(this);
        this.memory._currentTarget = iData;
        if(iData != null)
          this.walkTo(iData.pos, iData.range);
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'inPlace', {
    get() {
        return this.memory.moveTarget == null;
    },
    configurable: true,
});

Creep.prototype.walk = function () {
    if (this._walk) {
        return;
    }
    //if (this.memory.moveTarget == null && this.currentTarget && !inRangeTo(this.pos, this.currentTarget.pos, this.currentTarget.range)) {
      //  console.log(this.room.name, "the creep was not in range");
    //}

    if (this.room.controller && this.room.controller.level<3&& this.room.hostiles.length > 0 && !Military.includes(this.type)) {
        let enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 10);
        if (enemy.length>0) {
            let goals = _.map(enemy, function (enemy) {
                return { pos: enemy.pos, range: 10 };
            });
            let path = PathFinder.search(this.pos, goals, { flee: true }).path;
            if (this.currentTarget)
                this.memory.moveTarget = { pos: this.currentTarget.pos, range: this.currentTarget.range };
            this.moveByPath(path);
            this._walk = true;
            return;
        }
    }

    if (this.memory.moveTarget) {
        
        if (!inRangeTo(this.pos, this.memory.moveTarget.pos, this.memory.moveTarget.range)) {
            const workPos = restorePos(this.memory.moveTarget.pos);
            if (this.room.name != this.memory.moveTarget.pos.roomName)
                this.moveTo(workPos, { reusePath: 40 });
            else
              this.moveTo(workPos);
            this._walk = true;
        }

        if (inRangeTo(this.pos, this.memory.moveTarget.pos, this.memory.moveTarget.range))
            this.memory.moveTarget = null;       
    }
}

Creep.prototype.walkTo = function (pos: posData, rang: number): void {
    if (!inRangeTo(this.pos, pos,rang))
      this.memory.moveTarget = { pos: pos, range: rang };
};
Creep.prototype.walkToPos = function (x: number, y: number, room: string, rang: number) {
    if (!inRangeTo(this.pos, {x:x,y:y,roomName:room}, rang))
      this.memory.moveTarget = {
        pos: { x: x, y: y, roomName: room }, range: rang
    }
}

Creep.prototype.setTarget = function (id: string, type: TargetConstant, pos: posData, rang: number) {
    //this.walkTo(pos, rang);
    this.currentTarget = { ID: id, type: type, pos:pos, range:rang};
}

