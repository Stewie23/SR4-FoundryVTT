// Parser.ts (full file with SR4-friendly changes)
// Key changes:
// - Never access `._TEXT` directly in the base parser (SR4 XML may be plain strings).
// - Use IH.text / IH.num helpers everywhere.
// - Make logs + flags resilient when `id/name` are missing or differently shaped.
//
// NOTE: You MUST add `ImportHelper.text()` and `ImportHelper.num()` (shown after this file).

import { ParseData } from "./Types";
import { CompendiumKey } from "../importer/Constants";
import { DataImporter } from "../importer/DataImporter";
import { Sanitizer } from "@/module/sanitizer/Sanitizer";
import { BonusHelper as BH } from "../helper/BonusHelper";
import * as IconAssign from "../../iconAssigner/iconAssign";
import { ImportHelper as IH } from "../helper/ImportHelper";
import { TechnologyType } from "src/module/types/template/Technology";
import { DataDefaults, SystemConstructorArgs, SystemEntityType } from "src/module/data/DataDefaults";

export type SystemType<T extends SystemEntityType> = ReturnType<Parser<T>["getBaseSystem"]>;

export abstract class Parser<SubType extends SystemEntityType> {
  protected abstract readonly parseType: SubType;

  private isActor(): this is Parser<SystemEntityType & Actor.SubType> {
    return Object.keys(CONFIG.Actor.dataModels).includes(this.parseType);
  }

  protected abstract getFolder(jsonData: ParseData, compendiumKey: CompendiumKey): Promise<Folder>;
  protected async getItems(_jsonData: ParseData): Promise<Item.Source[]> { return []; }

  /** System construction entry point */
  protected getSystem(jsonData: ParseData) {
    // default behavior: just use base system skeleton (DataModel-compatible)
    return this.getBaseSystem();
  }

  private getSanitizedSystem(jsonData: ParseData) {
    const system = this.getSystem(jsonData);

    const schema =
      CONFIG[this.isActor() ? "Actor" : "Item"].dataModels[this.parseType].schema;

    const correctionLogs = Sanitizer.sanitize(schema, system);

    if (correctionLogs) {
      console.warn(
        `Document Sanitized on Import:\n` +
        `Name: ${IH.text((jsonData as any)?.name, "<no name>")};\n` +
        `Type: ${this.isActor() ? "Actor" : "Item"}; SubType: ${String(this.parseType)};\n`
      );
      console.table(correctionLogs);
    }

    return system;
  }

  public async Parse(jsonData: ParseData, compendiumKey: CompendiumKey): Promise<Actor.CreateData | Item.CreateData> {
    const itemPromise = this.getItems(jsonData);
    let bonusPromise: Promise<void> | undefined;

    const translatedName =
      IH.text(IH.getArray((jsonData as any)?.translate)[0]?._TEXT, "") ||
      IH.text((jsonData as any)?.name, "<no name>");

    const entity = {
      img: undefined as string | undefined | null,
      name: translatedName,
      type: this.parseType as any,
      system: this.getSanitizedSystem(jsonData),
      folder: (await this.getFolder(jsonData, compendiumKey)).id,
    } satisfies Actor.CreateData | Item.CreateData;

    const system = entity.system as any;

    // Add technology
    if ("technology" in system && system.technology)
      this.setTechnology(system.technology as TechnologyType, jsonData);

    this.setImporterFlags(entity, jsonData);

    if (DataImporter.iconSet)
      entity.img = IconAssign.iconAssign(DataImporter.iconSet, entity);

    if ("bonus" in (jsonData as any) && (jsonData as any).bonus)
      bonusPromise = BH.addBonus(entity as any, (jsonData as any).bonus);

    // SR4 XML sometimes has page/source as plain text too
    const hasPage = "page" in (jsonData as any) && (jsonData as any).page != null;
    const hasSource = "source" in (jsonData as any) && (jsonData as any).source != null;

    if (hasPage && hasSource) {
      const page =
        IH.text(IH.getArray((jsonData as any)?.altpage)[0]?._TEXT, "") ||
        IH.text((jsonData as any)?.page, "");

      const source = IH.text((jsonData as any)?.source, "");

      if (system?.description) system.description.source = `${source} ${page}`.trim();
    }

    // Runtime branching
    if (this.isActor()) {
      (entity as Actor.CreateData).items = await itemPromise;
    } else {
      (entity as Item.CreateData).flags = { sr4: { embeddedItems: await itemPromise } };
    }

    await bonusPromise;

    return entity;
  }

  private setTechnology(technology: TechnologyType, jsonData: ParseData) {
    // SR4-safe: accept either `{_TEXT:"..."}` or plain string/number
    technology.availability =
      "avail" in (jsonData as any) ? IH.text((jsonData as any).avail, "") : "";

    technology.cost =
      "cost" in (jsonData as any) ? IH.num((jsonData as any).cost, 0) : 0;

    technology.rating =
      "rating" in (jsonData as any) ? IH.num((jsonData as any).rating, 0) : 0;

    // keep original intent: write to conceal.base
    if (technology.conceal) {
      technology.conceal.base =
        "conceal" in (jsonData as any) ? IH.num((jsonData as any).conceal, 0) : 0;
    }
  }

  protected setImporterFlags(entity: Actor.CreateData | Item.CreateData, jsonData: ParseData) {
    const category =
      "category" in (jsonData as any) ? IH.text((jsonData as any)?.category, "") : "";

    // id can be missing in some SR4 exports; keep stable fallback
    const sourceId = IH.text((jsonData as any)?.id, "");

    (entity.system as any)!.importFlags = {
      category,
      isFreshImport: true,
      name: IH.text((jsonData as any)?.name, ""),
      sourceid: sourceId,
    };
  }

  protected getBaseSystem(createData: SystemConstructorArgs<SubType> = {}) {
    return DataDefaults.baseSyst
