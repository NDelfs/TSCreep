import { PrettyPrintErr } from "../utils/PrettyPrintErr";

interface overflowBalance {
    A: number;
    P: string;
}

interface underflowBalance {
    R: ResourceConstant;
    A: number;
    P: string;
}

interface sendTrans {

}

const OVERFLOW_THRESHOLD = 5000;
const OVERFLOW_INTERNALTRADE = 3000;
const OVERFLOW_EXTERNALTRADE = 30000;
const UNDERFLOW_THRESHOLD = 2000;

export function Market(): void {
    let overflow: { [R: string]: overflowBalance[] } = {};
    let underflow: underflowBalance[] = [];
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        if (room.terminal && room.terminal.store.energy > OVERFLOW_THRESHOLD) {
            let keys = Object.keys(room.terminal.store) as ResourceConstant[];
            for (let key of keys) {
                let res = room.terminal.store[key] || 0;
                if (res > OVERFLOW_THRESHOLD) {
                    if (overflow[key] == null)
                        overflow[key] = [];
                    overflow[key].push({ A: res, P: room.name });
                }
            }

            if (room.name == "E49N47") {
                let reqs: ResourceConstant[] = [RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_HYDROGEN];

                for (let req of reqs) {
                    let res = room.terminal.store[req] || 0;
                    if (res < UNDERFLOW_THRESHOLD) {
                        underflow.push({R: req, A: UNDERFLOW_THRESHOLD- res, P: room.name });
                    }
                }
            }
        }
    }

    for (let under of underflow) {
        let avails = overflow[under.R] || [];
        for (let avail of avails) {
            let term = Game.rooms[avail.P].terminal;
            if (term) {
                let amount = Math.min(avail.A, under.A);
                avail.A -= amount;
                under.A -= amount;
                if (amount > 1000) {
                    let err = term.send(under.R, amount, under.P, "Balancing resources");
                    console.log("Traded", under.R, "from", avail.P, "to", under.P, "with error", PrettyPrintErr(err));
                }
            }
        }
    }

    for (let overR in overflow) {
        let avails = overflow[overR] || [];
        for (let avail of avails) {
            let term = Game.rooms[avail.P].terminal;
            if (term && avail.A > OVERFLOW_EXTERNALTRADE) {
                //Game.market.calcTransactionCost(1000, "E49N47", "E21S28")

               // Game.market.deal("5dc83301bba44770965425fb", 1000, "E49N47")

                //Game.market.getAllOrders({ type: ORDER_BUY, resourceType: RESOURCE_KEANIUM }).sort(function (a, b) { return b.price - a.price; })[0].price
                
            }
        }
    }
}
