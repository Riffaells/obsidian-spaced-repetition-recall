// https://github.com/mgmeyers/obsidian-kanban/blob/93014c2512507fde9eafd241e8d4368a8dfdf853/src/lang/helpers.ts

import { moment } from "obsidian";
import af from "./locale/af/index";
import ar from "./locale/ar/index";
import cz from "./locale/cz/index";
import bn from "./locale/bn/index";
import da from "./locale/da/index";
import de from "./locale/de/index";
import en from "./locale/en/index";
import enGB from "./locale/en-gb/index";
import es from "./locale/es/index";
import fr from "./locale/fr/index";
import hi from "./locale/hi/index";
import id from "./locale/id/index";
import it from "./locale/it/index";
import ja from "./locale/ja/index";
import ko from "./locale/ko/index";
import mr from "./locale/mr/index";
import nl from "./locale/nl/index";
import no from "./locale/no/index";
import pl from "./locale/pl/index";
import pt from "./locale/pt/index";
import ptBR from "./locale/pt-br/index";
import ro from "./locale/ro/index";
import ru from "./locale/ru/index";
import ta from "./locale/ta/index";
import te from "./locale/te/index";
import th from "./locale/th/index";
import tr from "./locale/tr/index";
import uk from "./locale/uk/index";
import ur from "./locale/ur/index";
import vi from "./locale/vi/index";
import zhCN from "./locale/zh-cn/index";
import zhTW from "./locale/zh-tw/index";

export const localeMap: { [k: string]: Partial<typeof en> } = {
    af,
    ar,
    bn,
    cs: cz,
    da,
    de,
    en,
    "en-gb": enGB,
    es,
    fr,
    hi,
    id,
    it,
    ja,
    ko,
    mr,
    nl,
    nn: no,
    pl,
    pt,
    "pt-br": ptBR,
    ro,
    ru,
    ta,
    te,
    th,
    tr,
    uk,
    ur,
    vi,
    "zh-cn": zhCN,
    "zh-tw": zhTW,
};

const locale = localeMap[moment.locale()];

function interpolate(str: string, params: Record<string, unknown>): string {
    return str.replace(/\{(\w+)}/g, (match, key) => {
        const value = params[key];
        if (value === undefined) return match;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return JSON.stringify(value);
    });
}

export function t(str: keyof typeof en, params?: Record<string, unknown>): string {
    if (!locale) {
        console.error(`SRS error: Locale ${moment.locale()} not found.`);
    }

    const result = (locale && (locale as any)[str]) || (en as any)[str] || str;

    if (params) {
        return interpolate(result, params);
    }

    return result;
}
