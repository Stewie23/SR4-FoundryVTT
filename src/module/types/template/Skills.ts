import { SR5 } from "@/module/config";
import { ModifiableValue } from "./Base";
import { ModifiableField } from "../fields/ModifiableField";
import { FixedTypeObjectField } from "../fields/FixedTypeObjectField";
const { SchemaField, BooleanField, ArrayField, NumberField, StringField, TypedObjectField, HTMLField } = foundry.data.fields;

export type SkillCategories = 'active' | 'language' | 'knowledge';

export const SkillField = () => ({
    ...ModifiableValue(),
    name: new StringField({ required: true }),
    img: new StringField({ required: true }),
    description: new HTMLField({ required: true }),
    hidden: new BooleanField(),
    label: new StringField({ required: true }),
    attribute: new StringField({
        blank: true,
        required: true,
        choices: SR5.attributes
    }),
    _delete: new BooleanField(), // Does it use it?
    specs: new ArrayField(new StringField({ required: true })),
    canDefault: new BooleanField({ initial: true }),
    isNative: new BooleanField({ initial: false }), // this only actually applies to language skills
    id: new StringField({ required: true }),
    link: new StringField({ required: true }),
    group: new StringField({ required: true }),
    bonus: new ArrayField(new SchemaField({
        key: new StringField({ required: true }),
        value: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
    })),
});

function skill(createData: foundry.data.fields.SchemaField.CreateData<ReturnType<typeof SkillField>> = {}) {
    const initialValue = new ModifiableField(SkillField()).getInitialValue(createData);
    return foundry.utils.mergeObject(initialValue, createData);
}

// Use FixedTypeObjectField to allow for DataField.applyChange to work on skills.
// See class documentation for more information.
export const Skills = () => new FixedTypeObjectField(
    new ModifiableField(SkillField()),
    {
        required: true,
        initial: {
            // Agility
            //Combat
            archery: skill({ attribute: 'agility', id: 'archery' }),
            automatics: skill({ attribute: 'agility', group: 'Firearms', id: 'automatics' }),
            blades: skill({ attribute: 'agility', group: 'Close Combat', id: 'blades', }),
            clubs: skill({ attribute: 'agility', group: 'Close Combat', id: 'clubs' }),
            exotic_melee: skill({ attribute: 'agility', canDefault: false, id: 'exotic_melee' }), // how to deal with exotic melee weapons?
            exotic_range: skill({ attribute: 'agility', canDefault: false, id: 'exotic_range' }), // how to deal with exotic ranged weapons?
            gunnery: skill({ attribute: 'agility', id: 'gunnery' }),
            heavy_weapons: skill({ attribute: 'agility', group: 'Firearms', id: 'heavy_weapons' }),
            longarms: skill({ attribute: 'agility', group: 'Firearms', id: 'longarms' }),
            pistols: skill({ attribute: 'agility', group: 'Firearms', id: 'pistols' }),
            throwing_weapons: skill({ attribute: 'agility', group: 'Close Combat', id: 'throwing_weapons' }),
            unarmed_combat: skill({ attribute: 'agility', group: 'Close Combat', id: 'unarmed_combat' }),
            //Non Combat
            gymnastics: skill({ attribute: 'agility', group: 'Athletics', id: 'gymnastics' }),
            palming: skill({ attribute: 'agility', group: 'Stealth', canDefault: false, id: 'palming' }),
            forgery: skill({ attribute: 'agility', id: 'forgery' }),
            locksmith: skill({ attribute: 'agility', id: 'locksmith' }),
            infiltration: skill({ attribute: 'agility', group: 'Stealth', canDefault: false, id: 'infiltration' }),

            //Body
            diving: skill({ attribute: 'body', id: 'diving' }), 
            parachuting skill({ attribute: 'body', id: 'parachuting' }), 

            //Strenght
            climbing: skill({ attribute: 'strength', group: 'Athletics', id: 'climbing' }),   
            running: skill({ attribute: 'strength', group: 'Athletics', id: 'running' }),    
            swimming: skill({ attribute: 'strength', group: 'Athletics', id: 'swimming' }),

            //Reaction
            // Vehicle Skills
            pilot_aerospace: skill({ attribute: 'reaction', canDefault: false, id: 'pilot_aerospace' }),
            pilot_aircraft: skill({ attribute: 'reaction', canDefault: false, id: 'pilot_aircraft' }),
            pilot_walker: skill({ attribute: 'reaction', canDefault: false, id: 'pilot_walker' }),
            pilot_ground_craft: skill({ attribute: 'reaction', id: 'pilot_ground_craft' }),
            pilot_water_craft: skill({ attribute: 'reaction', id: 'pilot_water_craft' }),
            pilot_exotic_vehicle: skill({ attribute: 'reaction', canDefault: false, id: 'pilot_exotic_vehicle' }), // how to deal with exotic vehicles?
            dodge: skill({ attribute: 'reaction', id: 'dodge' }), 

            // Charisma
            con: skill({ attribute: 'charisma', group: 'Acting', id: 'con' }),
            etiquette: skill({ attribute: 'charisma', group: 'Influence', id: 'etiquette' }),
            instruction: skill({ attribute: 'charisma', id: 'instruction' }),
            intimidation: skill({ attribute: 'charisma', id: 'intimidation' }),
            leadership: skill({ attribute: 'charisma', group: 'Influence', id: 'leadership' }),
            negotiation: skill({ attribute: 'charisma', group: 'Influence', id: 'negotiation' }),

            // Intutition
            artisan: skill({ attribute: 'intuition', canDefault: false, id: 'artisan' }),
            assensing: skill({ attribute: 'intuition', canDefault: false, id: 'assensing' }),
            disguise: skill({ attribute: 'intuition', group: 'Stealth', id: 'disguise' }),  
            navigation: skill({ attribute: 'intuition', group: 'Outdoors', id: 'navigation' }),   
            perception: skill({ attribute: 'intuition', id: 'perception' }),             
            survival: skill({ attribute: 'willpower', group: 'Outdoors', id: 'survival' }),  
            shadowing: skill({ attribute: 'intuition',group: 'Stealth' id: 'shadowing' }),      
            tracking: skill({ attribute: 'intuition', group: 'Outdoors', id: 'tracking' }),

            //Willpower
            astral_combat: skill({ attribute: 'willpower', canDefault: false, id: 'astral_combat' }),
            surival: skill({ attribute: 'willpower', group: 'Outdoors', id: 'survival' }),

            //Logic
            aeronautics_mechanic: skill({ attribute: 'logic', group: 'Engineering', canDefault: false, id: 'aeronautics_mechanic' }),
            automotive_mechanic: skill({ attribute: 'logic', group: 'Engineering', canDefault: false, id: 'automotive_mechanic' }),
            industrial_mechanic: skill({ attribute: 'logic', group: 'Engineering', canDefault: false, id: 'industrial_mechanic' }),
            nautical_mechanic: skill({ attribute: 'logic', group: 'Engineering', canDefault: false, id: 'nautical_mechanic' }),
            arcana: skill({ attribute: 'logic', id: 'arcana' }),    
            armorer: skill({ attribute: 'logic', id: 'armorer' }),      
            chemistry: skill({ attribute: 'logic', canDefault: false, id: 'chemistry' }),
            computer: skill({ attribute: 'logic', group: 'Electronics', id: 'computer' }),
            cybercombat: skill({ attribute: 'logic', group: 'Cracking', id: 'cybercombat' }),
            cybertechnology: skill({ attribute: 'logic', group: 'Biotech', canDefault: false, id: 'cybertechnology' }),
            datasearch skill({ attribute: 'logic', id: 'datasearch' }),  
            demolitions: skill({ attribute: 'logic', id: 'demolitions' }),
            electronic_warfare: skill({ attribute: 'logic', group: 'Cracking', canDefault: false, id: 'electronic_warfare' }),
            first_aid: skill({ attribute: 'logic', group: 'Biotech', id: 'first_aid' }),
            hacking: skill({ attribute: 'logic', group: 'Cracking', id: 'hacking' }),
            hardware: skill({ attribute: 'logic', group: 'Electronics', canDefault: false, id: 'hardware' }),
            medicine: skill({ attribute: 'logic', group: 'Biotech', canDefault: false, id: 'medicine' }),          
            software: skill({ attribute: 'logic', group: 'Electronics', canDefault: false, id: 'software' }),

            // Magic Skills
            banishing: skill({ attribute: 'magic', group: 'Conjuring', canDefault: false, id: 'banishing' }),
            binding: skill({ attribute: 'magic', group: 'Conjuring', canDefault: false, id: 'binding' }),
            counterspelling: skill({ attribute: 'magic', group: 'Sorcery', canDefault: false, id: 'counterspelling' }),
            ritual_spellcasting: skill({ attribute: 'magic', group: 'Sorcery', canDefault: false, id: 'ritual_spellcasting' }),
            spellcasting: skill({ attribute: 'magic', group: 'Sorcery', canDefault: false, id: 'spellcasting' }),
            summoning: skill({ attribute: 'magic', group: 'Conjuring', canDefault: false, id: 'summoning' }),

            // Resonance Skills
            compiling: skill({ attribute: 'resonance', group: 'Tasking', canDefault: false, id: 'compiling' }),
            decompiling: skill({ attribute: 'resonance', group: 'Tasking', canDefault: false, id: 'decompiling' }),
            registering: skill({ attribute: 'resonance', group: 'Tasking', canDefault: false, id: 'registering' }),
        }
    }
);

console.log(Skills().getInitialValue());

export const KnowledgeSkillList = (initialAttribute: string) => ({
    attribute: new StringField({
        required: true,
        initial: initialAttribute,
        choices: ["willpower", "logic", "intuition", "charisma"]
    }),
    value: new TypedObjectField(new ModifiableField(SkillField()), {required: true, initial: {}}),
});

export const KnowledgeSkills = () => ({
    street: new SchemaField(KnowledgeSkillList('intuition')),
    academic: new SchemaField(KnowledgeSkillList('logic')),
    professional: new SchemaField(KnowledgeSkillList('logic')),
    interests: new SchemaField(KnowledgeSkillList('intuition')),
});

// Not yet implemented in fvtt-types curently
export type SkillsType = Record<string, SkillFieldType>;
export type SkillFieldType = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof SkillField>>;
export type KnowledgeSkillsType = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof KnowledgeSkills>>;

export type KnowledgeSkillCategory = keyof ReturnType<typeof KnowledgeSkills>;
