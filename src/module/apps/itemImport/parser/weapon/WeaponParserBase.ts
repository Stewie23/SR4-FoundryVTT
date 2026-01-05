import { SR5 } from '../../../../config';
import { Parser, SystemType } from '../Parser';
import { Weapon } from '../../schema/WeaponsSchema';
import { RangeType } from 'src/module/types/item/Weapon';
import { DataDefaults } from '../../../../data/DataDefaults';
import { ImportHelper as IH } from '../../helper/ImportHelper';
import { CompendiumKey, Constants } from '../../importer/Constants';
import { DamageType, DamageTypeType } from 'src/module/types/item/Action';
import PhysicalAttribute = Shadowrun.PhysicalAttribute;

type DamageElement = DamageType['element']['base'];

export class WeaponParserBase extends Parser<'weapon'> {
    protected readonly parseType = 'weapon';

    /**
     * SR4/SR5 accessory normalization:
     * - SR4: <accessory>Stock</accessory> -> acc is string OR { _TEXT: "Stock" }
     * - SR5: <accessory><name>Stock</name>...</accessory> -> acc.name._TEXT
     */
    private static getAccessoryName(acc: any): string {
        if (acc == null) return '';
        if (typeof acc === 'string') return acc.trim();

        if (typeof acc === 'object') {
            // SR4 simple xml2js form: { _TEXT: "Stock" }
            if ('_TEXT' in acc) return String((acc as any)._TEXT ?? '').trim();

            // SR5 form: { name: { _TEXT: "Stock" }, ... }
            const n = (acc as any).name;
            if (typeof n === 'string') return n.trim();
            if (n && typeof n === 'object' && '_TEXT' in n) return String(n._TEXT ?? '').trim();
        }

        return '';
    }

    private static getAccessoryRating(acc: any): number | undefined {
        if (!acc || typeof acc !== 'object') return undefined;
        const r = (acc as any).rating;
        const txt = r && typeof r === 'object' && '_TEXT' in r ? String(r._TEXT ?? '').trim() : '';
        if (!txt) return undefined;
        const n = Number(txt);
        return Number.isFinite(n) ? n : undefined;
    }

    protected override async getItems(jsonData: Weapon): Promise<Item.Source[]> {
        const rawAccessories = (jsonData as any)?.accessories?.accessory;
        if (!rawAccessories) return [];

        const accessories = IH.getArray(rawAccessories);

        // Build list of names robustly (SR4 + SR5)
        const accessoriesNames = accessories
            .map(a => WeaponParserBase.getAccessoryName(a))
            .filter(n => n.length > 0);

        if (accessoriesNames.length === 0) return [];

        const foundItems = await IH.findItems('Weapon_Mod', accessoriesNames);
        const itemMap = new Map(foundItems.map(({ name_english, ...i }) => [name_english, i]));

        const result: Item.Source[] = [];
        for (const accessory of accessories) {
            const name = WeaponParserBase.getAccessoryName(accessory);
            if (!name) continue;

            const item = itemMap.get(name);

            if (!item) {
                console.warn(`[Accessory Missing]\nWeapon: ${(jsonData as any)?.name?._TEXT ?? 'Unknown'}\nAccessory: ${name}`);
                continue;
            }

            item._id = foundry.utils.randomID();
            const system = item.system as SystemType<'modification'>;
            system.technology.equipped = true;

            // Only exists on SR5-style accessories; SR4 simple accessory strings have no rating
            const rating = WeaponParserBase.getAccessoryRating(accessory);
            if (rating !== undefined) system.technology.rating = rating;

            result.push(item);
        }

        return result;
    }

    private GetSkill(weaponJson: Weapon): string {
        const useskill = (weaponJson as any)?.useskill?._TEXT;
        if (useskill) {
            if (Constants.MAP_CATEGORY_TO_SKILL[useskill]) return Constants.MAP_CATEGORY_TO_SKILL[useskill];
            return String(useskill).replace(/[\s\-]/g, '_').toLowerCase();
        }

        const category = (weaponJson as any)?.category?._TEXT ?? '';
        if (category && Constants.MAP_CATEGORY_TO_SKILL[category]) return Constants.MAP_CATEGORY_TO_SKILL[category];

        const type = String((weaponJson as any)?.type?._TEXT ?? '').toLowerCase();
        return type === 'range' ? 'exotic_range' : 'exotic_melee';
    }

    public static GetWeaponType(weaponJson: Weapon): SystemType<'weapon'>['category'] {
        const type = (weaponJson as any)?.type?._TEXT;

        // melee is the least specific, all melee entries are accurate
        if (type === 'Melee') {
            return 'melee';
        } else {
            // "Throwing Weapons" maps to "thrown", preferring useskill over category
            const skillCategory = (weaponJson as any)?.useskill?._TEXT ?? (weaponJson as any)?.category?._TEXT;
            if (skillCategory === 'Throwing Weapons') return 'thrown';

            // ranged is everything else
            return 'range';
        }
    }

    protected override getSystem(jsonData: Weapon) {
        const system = this.getBaseSystem();

        system.action.type = 'varies';
        system.action.attribute = 'agility';

        const category = (jsonData as any)?.category?._TEXT ?? '';

        system.category = WeaponParserBase.GetWeaponType(jsonData);
        system.subcategory = String(category).toLowerCase();

        system.action.skill = this.GetSkill(jsonData);
        system.action.damage = this.GetDamage(jsonData as any);

        // Accuracy is SR5 data; SR4 often does not have it. Only use if present.
        const accText = (jsonData as any)?.accuracy?._TEXT;
        if (accText) {
            let accuracy: string = String(accText);
            if (accuracy.includes('Physical')) {
                system.action.limit.attribute = 'physical';
                accuracy = accuracy.replace('Physical', '').trim();
            }
            system.action.limit.base = Number(accuracy) || 0;
        }

        // Conceal: SR4 has it; tolerate missing / NaN
        const concealRaw = (jsonData as any)?.conceal?._TEXT;
        const concealNum = Number(concealRaw);
        system.technology.conceal.base = Number.isFinite(concealNum) ? concealNum : 0;

        return system;
    }

    protected GetDamage(jsonData: Weapon): DamageType {
        const jsonDamage = String((jsonData as any)?.damage?._TEXT ?? '');

        // ex. 15S(e)
        const simpleDamage = /^([0-9]+)([PSM])? ?(\([a-zA-Z]+\))?/g.exec(jsonDamage);
        // ex. ({STR}+1)P(fire)  (SR5-style)
        const strengthDamage = /^\({STR}([+-]?[0-9]*)\)([PSM])? ?(\([a-zA-Z]+\))?/g.exec(jsonDamage);
        // ex. (STR/2+1)P  (SR4-style) -> we won't fully evaluate; we at least capture type and set attribute=strength
        const sr4StrengthDamage = /^\((STR)[^)]*\)([PSM])? ?(\([a-zA-Z]+\))?/gi.exec(jsonDamage);

        let damageType: DamageTypeType = 'physical';
        let damageAttribute: PhysicalAttribute | undefined;
        let damageBase = 0;
        let damageElement: DamageElement = '';

        if (simpleDamage) {
            damageBase = parseInt(simpleDamage[1], 10);
            damageType = this.parseDamageType(simpleDamage[2]);
            damageElement = this.parseDamageElement(simpleDamage[3]);
        } else if (strengthDamage) {
            damageAttribute = 'strength';
            damageBase = parseInt(strengthDamage[1], 10) || 0;
            damageType = this.parseDamageType(strengthDamage[2]);
            damageElement = this.parseDamageElement(strengthDamage[3]);
        } else if (sr4StrengthDamage) {
            // SR4 formula: keep base at 0 but mark strength-based so downstream can handle it later.
            damageAttribute = 'strength';
            damageBase = 0;
            damageType = this.parseDamageType(sr4StrengthDamage[2]);
            damageElement = this.parseDamageElement(sr4StrengthDamage[3]);
        }

        // AP: SR4 often uses "-" meaning 0
        const apRaw = String((jsonData as any)?.ap?._TEXT ?? '').trim();
        const damageAp = (apRaw === '' || apRaw === '-' || apRaw === '—') ? 0 : (Number(apRaw) || 0);

        const partialDamageData = {
            type: {
                base: damageType,
                value: damageType,
            },
            base: damageBase,
            value: damageBase,
            ap: {
                base: damageAp,
                value: damageAp,
                mod: [],
            },
            element: {
                base: damageElement,
                value: damageElement,
            },
            ...(damageAttribute && { attribute: damageAttribute })
        } as const;

        return DataDefaults.createData('damage', partialDamageData);
    }

    protected parseDamageType(parsedType: string | undefined): DamageTypeType {
        switch (parsedType) {
            case 'S':
                return 'stun';
            case 'M':
                return 'matrix';
            case 'P':
            default:
                return 'physical';
        }
    }

    protected parseDamageElement(parsedElement: string | undefined): DamageElement {
        switch (parsedElement?.toLowerCase()) {
            case '(e)':
                return 'electricity';
            case '(fire)':
                return 'fire';
            default:
                return '';
        }
    }

    protected GetRangeDataFromImportedCategory(category: string): RangeType | undefined {
        const systemRangeCategory: Exclude<keyof typeof SR5.weaponRangeCategories, "manual"> | undefined =
            Constants.MAP_IMPORT_RANGE_CATEGORY_TO_SYSTEM_RANGE_CATEGORY[category];
        if (!systemRangeCategory) return;

        return {
            ...SR5.weaponRangeCategories[systemRangeCategory].ranges,
            category: systemRangeCategory,
            attribute: 'agility',
        };
    }

    protected override setImporterFlags(entity: Item.CreateData, jsonData: Weapon): void {
        super.setImporterFlags(entity, jsonData);

        if (entity.system!.importFlags!.category === 'Gear') {
            entity.system!.importFlags!.category = entity.name.split(':')[0].trim();
        }
    }

    protected override async getFolder(jsonData: Weapon, compendiumKey: CompendiumKey): Promise<Folder> {
        const categoryData = (jsonData as any)?.category?._TEXT ?? '';
        const root = WeaponParserBase.GetWeaponType(jsonData).capitalize() ?? "Other";
        const folderName = IH.getTranslatedCategory('weapons', String(categoryData));

        return IH.getFolder(compendiumKey, root, root === 'Thrown' ? undefined : folderName);
    }
}
