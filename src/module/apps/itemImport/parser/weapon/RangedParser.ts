import { WeaponParserBase } from "./WeaponParserBase";
import { DataDefaults } from "../../../../data/DataDefaults";
import { Weapon } from "../../schema/WeaponsSchema";

type ParsedAmmo = {
  capacity: number;        // bullets per feed device
  count: number;           // number of feed devices if "2x..."
  clipTypeKey: string;     // e.g. "removable_clip"
  raw: string;             // original string
  hasOrVariant: boolean;   // contains "or"
  isExternalSource: boolean;
};

function mapAmmoSuffixToClipTypeKey(suffix: string): string {
  switch (suffix.toLowerCase()) {
    case "c": return "removable_clip";
    case "m": return "internal_magazin"; // keep config spelling
    case "b": return "belt_fed";
    case "d": return "drum";
    default: return "";
  }
}

function parseSr4AmmoNotation(ammoRaw: string): ParsedAmmo {
  const raw = (ammoRaw ?? "").trim();
  if (!raw) {
    return { capacity: 0, count: 1, clipTypeKey: "", raw, hasOrVariant: false, isExternalSource: false };
  }

  const hasOrVariant = /\s+or\s+/i.test(raw);
  const primary = raw.split(/\s+or\s+/i)[0].trim();

  const isExternalSource = /^external\s+source$/i.test(primary);
  if (isExternalSource) {
    return { capacity: 0, count: 1, clipTypeKey: "", raw, hasOrVariant, isExternalSource: true };
  }

  // 2x50(d)
  const mMulti = /^(\d+)\s*x\s*(\d+)\s*\(([a-z])\)\s*$/i.exec(primary);
  if (mMulti) {
    const count = Number(mMulti[1]) || 1;
    const capacity = Number(mMulti[2]) || 0;
    const clipTypeKey = mapAmmoSuffixToClipTypeKey(mMulti[3]);
    return { capacity, count, clipTypeKey, raw, hasOrVariant, isExternalSource: false };
  }

  // 10(c)
  const mSingle = /^(\d+)\s*\(([a-z])\)\s*$/i.exec(primary);
  if (mSingle) {
    const capacity = Number(mSingle[1]) || 0;
    const clipTypeKey = mapAmmoSuffixToClipTypeKey(mSingle[2]);
    return { capacity, count: 1, clipTypeKey, raw, hasOrVariant, isExternalSource: false };
  }

  // Unknown format: keep raw, but don't crash
  return { capacity: 0, count: 1, clipTypeKey: "", raw, hasOrVariant, isExternalSource: false };
}

export class RangedParser extends WeaponParserBase {
  protected override getSystem(jsonData: Weapon) {
    const system = super.getSystem(jsonData);

    // RC (Some weapons don't have rc defined)
    const rc = Number((jsonData as any)?.rc?._TEXT) || 0;
    system.range.rc.base = rc;
    system.range.rc.value = rc;

    // Range category: prefer <range>, fallback to <category>
    const rangeCategory = (jsonData as any)?.range?._TEXT || (jsonData as any)?.category?._TEXT || "";
    system.range.ranges = DataDefaults.createData("range", this.GetRangeDataFromImportedCategory(rangeCategory));

    // Ammo: SR4 notation parsing
    const ammoText = String((jsonData as any)?.ammo?._TEXT ?? "");
    const parsedAmmo = parseSr4AmmoNotation(ammoText);

    system.ammo.current.max = parsedAmmo.capacity;
    system.ammo.current.value = parsedAmmo.capacity;

    // One feed device is loaded; the rest are spares
    const spares = Math.max(0, parsedAmmo.count - 1);
    system.ammo.spare_clips.value = spares;
    system.ammo.spare_clips.max = spares;

    // Clip type key (matches your config.weaponCliptypes keys)
    if (parsedAmmo.clipTypeKey) {
      system.ammo.clip_type = parsedAmmo.clipTypeKey as any;
    }

    // Preserve raw ammo string if ambiguous/unknown/external
    if (parsedAmmo.hasOrVariant || parsedAmmo.isExternalSource || !parsedAmmo.clipTypeKey) {
      system.importFlags = system.importFlags ?? ({} as any);
      (system.importFlags as any).ammoRaw = parsedAmmo.raw;
    }

    // Fire modes
    const modeData = String((jsonData as any)?.mode?._TEXT ?? "");
    system.range.modes = {
      single_shot: modeData.includes("SS"),
      semi_auto: modeData.includes("SA"),
      burst_fire: modeData.includes("BF"),
      full_auto: modeData.includes("FA"),
    };

    return system;
  }
}
