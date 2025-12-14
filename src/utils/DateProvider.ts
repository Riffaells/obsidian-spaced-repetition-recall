import moment, { Moment } from "moment";
import { ALLOWED_DATE_FORMATS } from "src/constants";

export interface IDateProvider {
    get today(): Moment;
    get startOfToday(): Moment;
    get endOfToday(): Moment;
}

export class LiveDateProvider implements IDateProvider {
    get today(): Moment {
        // return moment().startOf("day");
        return moment();
    }
    get startOfToday(): Moment {
        return moment().startOf("day");
    }
    get endOfToday(): Moment {
        return moment().endOf("day");
    }
}

export class StaticDateProvider implements IDateProvider {
    private moment: Moment;

    constructor(moment: Moment) {
        this.moment = moment;
    }

    get today(): Moment {
        return this.moment.clone();
    }
    get startOfToday(): Moment {
        return this.moment.clone().startOf("day");
    }
    get endOfToday(): Moment {
        return this.moment.clone().endOf("day");
    }

    static fromDateStr(str: string): StaticDateProvider {
        return new StaticDateProvider(DateUtil.dateStrToMoment(str));
    }
}

export class DateUtil {
    static dateStrToMoment(str: string): Moment {
        return moment(str, ALLOWED_DATE_FORMATS);
    }
}

export let globalDateProvider: IDateProvider = new LiveDateProvider();

const originDate: string = "2023-09-06";

export function setupStaticDateProvider(dateStr: string) {
    globalDateProvider = StaticDateProvider.fromDateStr(dateStr);
}

function getOriginDateAsMoment(): Moment {
    return DateUtil.dateStrToMoment(originDate);
}

export function setupStaticDateProvider_OriginDatePlusDays(days: number) {
    const simulatedDate: Moment = getOriginDateAsMoment().add(days, "d");
    globalDateProvider = new StaticDateProvider(simulatedDate);
}

export function setupStaticDateProvider_20230906() {
    setupStaticDateProvider(originDate);
}
