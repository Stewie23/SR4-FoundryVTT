import { Parser } from 'xml2js';
import { SR5Item } from '@/module/item/SR5Item';
import { SR5Actor } from '@/module/actor/SR5Actor';
import { ParseData, Schemas } from "../parser/Types";
import { ImportHelper as IH } from '../helper/ImportHelper';
import { ChummerFileXML, CompendiumKey, Constants } from './Constants';
import CompendiumCollection = foundry.documents.collections.CompendiumCollection;

/**
 * The most basic Chummer item data importer, designed to handle one or more Chummer data <type>.xml files.
 */
export abstract class DataImporter {
    /**
     * Set of icon paths to use for imported items.
     */
    public static iconSet: Set<string> | null = null;

    /**
     * Whether to override existing documents in the compendium.
     */
    public static overrideDocuments = true;

    /**
     * The list of Chummer XML files this importer can handle.
     */
    public readonly abstract files: readonly ChummerFileXML[];

    /**
     * Parses the specified JSON object and creates item representations.
     * @param chummerData - The JSON data to parse.
     */
    protected abstract _parse(chummerData: Schemas): Promise<void>;

    /**
     * Parses an XML string into a JSON object.
     * @param xmlString - The XML string to parse.
     * @returns A JSON object converted from the XML string.
     */
    private static async _xml2json(xmlString: string): Promise<Schemas> {
        const parser = new Parser({
            trim: true,             // Remove whitespace around text nodes
            attrkey: "$",           // Attributes will appear under the this key
            charkey: "_TEXT",       // Text content will appear under the this key
            emptyTag: () => null,   // Self-closing or empty tags value
            explicitRoot: false,    // Skip wrapping the root in an extra object
            explicitArray: false,   // Only create arrays when multiple elements exist
            explicitCharkey: true,  // Always use the charKey key for text nodes
        });

        return parser.parseStringPromise(xmlString);
    }

    /**
     * Parses an XML string and processes it using the importer.
     * @param xml - The XML string to parse and import.
     */
    public async parse(xml: string) {
        const schema = await DataImporter._xml2json(xml);
        return this._parse(schema);
    }

    /**
     * Parses an array of input data into an array of output items using a specified parser.
     */
    protected static async ParseItems<TInput extends ParseData>(
        inputs: TInput[],
        options: {
            documentType: string;
            compendiumKey: (data: TInput) => CompendiumKey;
            parser: { Parse: (data: TInput, compendiumKey: CompendiumKey) => Promise<Actor.CreateData | Item.CreateData> };
            filter?: (input: TInput) => boolean;
            injectActionTests?: (item: Item.CreateData) => void;
        }
    ): Promise<void> {
        const { compendiumKey, parser, filter, injectActionTests, documentType } = options;

        const itemMap = new Map<CompendiumKey, (Actor.CreateData | Item.CreateData)[]>();
        const compendiums: Partial<Record<CompendiumKey, CompendiumCollection<'Actor' | 'Item'>>> = {};

        const dataInput = filter
            ? inputs.filter(x => {
                try { return filter(x); }
                catch (e) { console.error("Error:\n", e, "\nData:\n", x); return false; }
            })
            : inputs;

        let counter = 0;
        let current = 0;
        const total = dataInput.length;
        const progressBar = ui.notifications.info(`Importing ${documentType}`, { progress: true });

        for (const data of dataInput) {
            try {
                current += 1;

                const name = data?.name?._TEXT || "Unknown";

                progressBar.update({
                    pct: current / total,
                    message: `${documentType} (${current}/${total}) Parsing: ${name}`,
                });

                // --- SR4-safe: <id> can be missing in some Chummer exports ---
                const rawGuid = (data as any)?.id?._TEXT as string | undefined;

                // Deterministic fallback so re-import does not duplicate when no GUID exists
                const fallbackKey = [
                    name,
                    (data as any)?.source?._TEXT ?? "",
                    (data as any)?.page?._TEXT ?? "",
                ].join("|");

                const id = rawGuid
                    ? IH.guidToId(rawGuid)
                    : IH.stableStringToId(fallbackKey);

                const key = compendiumKey(data);
                const compendium = compendiums[key] ??= (await IH.GetCompendium(key));

                if (!this.overrideDocuments && compendium.index.has(id)) {
                    IH.setItem(key, name, id);
                    continue;
                }

                const item = await parser.Parse(data, key);
                injectActionTests?.(item as Item.CreateData);

                (item as any)._id = id;
                IH.setItem(key, name, id);

                counter++;

                if (!itemMap.has(key)) itemMap.set(key, []);
                itemMap.get(key)!.push(item);
            } catch (error) {
                console.error("Error:\n", error, "\nData:\n", data);
                ui.notifications?.error(`Failed parsing ${documentType}: ${data?.name?._TEXT ?? "Unknown"}`);
            }
        }

        progressBar.remove();

        const notification = ui.notifications?.info(`${documentType}: Creating ${counter} documents`, { permanent: true });

        for (const [key, docs] of itemMap.entries()) {
            const compendium = Constants.MAP_COMPENDIUM_KEY[key];
            if (compendium.type === 'Actor') {
                await SR5Actor.create(docs as Actor.CreateData[], { pack: `world.${compendium.pack}`, keepId: true });
            } else {
                await SR5Item.create(docs as Item.CreateData[], { pack: `world.${compendium.pack}`, keepId: true });
            }
        }

        notification.remove();
        ui.notifications?.info(`${documentType}: ${counter} documents created`);
    }
}
