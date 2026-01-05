import { DataImporter } from "./DataImporter";
import { WeaponModParser } from "../parser/mod/WeaponModParser";
import { Accessory, WeaponModDefinition, WeaponsSchema } from "../schema/WeaponsSchema";
import { UpdateActionFlow } from "../../../item/flows/UpdateActionFlow";
import { ImportHelper as IH } from "../helper/ImportHelper";

export class WeaponModImporter extends DataImporter {
  public readonly files = ["weapons.xml"] as const;

  async _parse(jsonObject: WeaponsSchema): Promise<void> {
    // 1) Import accessory definitions as Weapon_Mod items
    await WeaponModImporter.ParseItems<Accessory>(
      IH.getArray(jsonObject.accessories?.accessory),
      {
        compendiumKey: () => "Weapon_Mod",
        parser: new WeaponModParser(),
        injectActionTests: item => {
          UpdateActionFlow.injectActionTestsIntoChangeData(item.type, item, item);
        },
        documentType: "Weapon Accessory"
      }
    );

    // 2) Import SR4 mod definitions (<mods><mod>...</mod></mods>) as Weapon_Mod items
    const mods = IH.getArray((jsonObject as any)?.mods?.mod) as WeaponModDefinition[];
    if (mods.length) {
      await WeaponModImporter.ParseItems<WeaponModDefinition>(
        mods,
        {
          compendiumKey: () => "Weapon_Mod",
          parser: new WeaponModParser(),
          injectActionTests: item => {
            UpdateActionFlow.injectActionTestsIntoChangeData(item.type, item, item);
          },
          documentType: "Weapon Mod"
        }
      );
    }
  }
}
