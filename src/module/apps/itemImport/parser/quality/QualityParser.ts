import { Parser } from "../Parser";
import { Quality } from "../../schema/QualitiesSchema";
import { CompendiumKey } from "../../importer/Constants";
import { ImportHelper as IH } from "../../helper/ImportHelper";

// Local helpers (you can move these into ImportHelper later)
function text(v: any, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "object") {
    if ("_TEXT" in v) return String(v._TEXT ?? fallback);
    if ("#text" in v) return String((v as any)["#text"] ?? fallback);
    if (Array.isArray(v) && v.length > 0) return text(v[0], fallback);
  }
  return String(v);
}

function num(v: any, fallback = 0): number {
  const s = text(v, "").trim();
  if (!s || s === "-" || s === "—") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: any, fallback = false): boolean {
  const s = text(v, "").trim().toLowerCase();
  if (!s) return fallback;
  return s === "true" || s === "1" || s === "yes";
}

export class QualityParser extends Parser<"quality"> {
  protected readonly parseType = "quality";

  protected override getSystem(jsonData: Quality) {
    const system = this.getBaseSystem();

    const category = text((jsonData as any).category);

    // SR4 categories can include Positive/Negative/Metagenic/etc.
    // Only map the clear ones; default to positive to avoid misclassifying.
    system.type = category === "Negative" ? "negative" : "positive";

    // SR4 often uses BP; your SR5 system uses karma field.
    // Keep behavior as before, but robust.
    system.karma = num((jsonData as any).karma, 0);

    return system;
  }

  protected override async getFolder(jsonData: Quality, compendiumKey: CompendiumKey): Promise<Folder> {
    const isMetagenic = bool((jsonData as any).metagenic, false);

    let rootFolder = game.i18n.localize("SR5.ItemTypes.Quality");
    if (isMetagenic) rootFolder += " (Metagenic)";

    const category = text((jsonData as any).category);
    const folderName = IH.getTranslatedCategory("qualities", category || ""); // safe even if empty

    return IH.getFolder(compendiumKey, rootFolder, folderName);
  }
}
