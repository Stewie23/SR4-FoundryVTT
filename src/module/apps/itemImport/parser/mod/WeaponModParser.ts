import { Parser, SystemType } from "../Parser";
import { ParseData } from "../Types";
import { CompendiumKey } from "../../importer/Constants";
import { ImportHelper as IH } from "../../helper/ImportHelper";

function text(v: any, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "object" && "_TEXT" in v) return String(v._TEXT ?? fallback);
  return String(v);
}

function num(v: any, fallback = 0): number {
  const s = text(v, "").trim();
  if (!s || s === "-" || s === "—") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export class WeaponModParser extends Parser<"modification"> {
  protected readonly parseType = "modification";

  protected override getSystem(jsonData: ParseData) {
    const data = jsonData as any; // Accessory OR WeaponModDefinition
    const system = this.getBaseSystem();

    // Accessories may have mount points; mods typically do not.
    const mountText = text(data.mount, "");
    if (mountText) {
      const mount = mountText.toLowerCase().split("/")[0] || "";
      system.mount_point = mount as SystemType<"modification">["mount_point"];
    }

    system.type = "weapon";

    // Some accessories define these; SR4 mods usually don't.
    system.rc = num(data.rc, 0);
    system.accuracy = num(data.accuracy, 0);

    // --- Preserve SR4 mod fields for display / later rules work ---
    // These fields don't necessarily exist in the SR5 data model; stash safely.
    (system as any)._sr4 = {
      slots: num(data.slots, 0),
      ammoBonus: num(data.ammobonus, 0),
      costRaw: text(data.cost, ""),      // can be "Weapon Cost"
      categoryRaw: text(data.category, "")
    };

    return system;
  }

  protected override setImporterFlags(entity: Item.CreateData, jsonData: ParseData): void {
    super.setImporterFlags(entity, jsonData);

    const data = jsonData as any;

    const mount = text(data.mount, "");
    const category = text(data.category, "");

    // For accessories: group by mount. For mods: use category or fallback.
    entity.system!.importFlags!.category = mount || category || "Weapon Mod";

    // Preserve SR4-only bits in importFlags too (easy to access in templates)
    const slots = num(data.slots, 0);
    const ammoBonus = num(data.ammobonus, 0);
    const costRaw = text(data.cost, "");

    (entity.system!.importFlags as any).slots = slots;
    (entity.system!.importFlags as any).ammoBonus = ammoBonus;

    // Only store costRaw if it isn't numeric (e.g. "Weapon Cost")
    if (costRaw && !Number.isFinite(Number(costRaw))) {
      (entity.system!.importFlags as any).costRaw = costRaw;
    }
  }

  protected override async getFolder(jsonData: ParseData, compendiumKey: CompendiumKey): Promise<Folder> {
    const data = jsonData as any;

    const mountText = text(data.mount, "");
    const categoryText = text(data.category, "Weapon Mod");

    const rootFolder = "Weapon-Mod";

    // Accessories: folder by mount (Top/Barrel/Under/Multiple Points)
    // Mods: folder by category ("Weapon Mod") or "Other"
    let folderName = mountText || categoryText || "Other";
    folderName = IH.getTranslatedCategory("weapons", folderName);

    if (folderName.includes("/")) folderName = "Multiple Points";

    return IH.getFolder(compendiumKey, rootFolder, folderName);
  }
}
