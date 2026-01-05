import { Parser, SystemType } from "../Parser";
import { Accessory, Mod } from "../../schema/WeaponsSchema";
import { CompendiumKey } from "../../importer/Constants";
import { ImportHelper as IH } from "../../helper/ImportHelper";

type ModOrAccessory = Accessory | Mod;

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

  protected override getSystem(jsonData: ModOrAccessory) {
    const system = this.getBaseSystem();

    // Accessories may have mount points; SR4 mods typically do not.
    const mountText = text((jsonData as any).mount, "");
    if (mountText) {
      const mount = mountText.toLowerCase().split("/")[0] || "";
      system.mount_point = mount as SystemType<"modification">["mount_point"];
    }

    system.type = "weapon";

    // Some accessories define these; SR4 mods usually don't.
    system.rc = num((jsonData as any).rc, 0);
    system.accuracy = num((jsonData as any).accuracy, 0);

    // --- SR4 mod fields: preserve for display / later rules work ---
    // Not all systems have dedicated fields for these; keeping them in importFlags is safe.
    // (Your base Parser already creates importFlags; we just add extra keys.)
    (system as any)._sr4 = {
      slots: num((jsonData as any).slots, 0),
      ammoBonus: num((jsonData as any).ammobonus, 0),
      costRaw: text((jsonData as any).cost, ""), // can be "Weapon Cost"
      categoryRaw: text((jsonData as any).category, ""),
    };

    return system;
  }

  protected override setImporterFlags(entity: Item.CreateData, jsonData: ModOrAccessory): void {
    super.setImporterFlags(entity, jsonData);

    const mount = text((jsonData as any).mount, "");
    const category = text((jsonData as any).category, "");

    // For accessories: group by mount. For mods: use category or "Weapon Mod".
    entity.system!.importFlags!.category = mount || category || "Weapon Mod";

    // Preserve SR4-only bits in importFlags too (easy to access in templates)
    const slots = num((jsonData as any).slots, 0);
    const ammoBonus = num((jsonData as any).ammobonus, 0);
    const costRaw = text((jsonData as any).cost, "");

    (entity.system!.importFlags as any).slots = slots;
    (entity.system!.importFlags as any).ammoBonus = ammoBonus;
    if (costRaw && isNaN(Number(costRaw))) {
      (entity.system!.importFlags as any).costRaw = costRaw;
    }
  }

  protected override async getFolder(jsonData: ModOrAccessory, compendiumKey: CompendiumKey): Promise<Folder> {
    const mountText = text((jsonData as any).mount, "");
    const categoryText = text((jsonData as any).category, "Weapon Mod");

    const rootFolder = "Weapon-Mod";

    // Accessories: folder by mount (Top/Barrel/Under/Multiple Points)
    // Mods: folder by category ("Weapon Mod") or "Other"
    let folderName = mountText || categoryText || "Other";
    folderName = IH.getTranslatedCategory("weapons", folderName);

    if (folderName.includes("/")) folderName = "Multiple Points";

    return IH.getFolder(compendiumKey, rootFolder, folderName);
  }
}
