import Sr5Tour from "./sr5Tours";

export default async function registerSR5Tours() {
    try {

        game.tours.register(
            'shadowrun5e',
            'ConditionMonitor',
            await Sr5Tour.fromJSON('/systems/sr4/dist/tours/ConditionMonitor.json'),
        );


    //      game.tours.register(
    //       'shadowrun5e',
    //       'CharacterImport',
    //        // @ts-expect-error
    //       await Sr5Tour.fromJSON('/systems/sr4/dist/tours/character-import.json'),
    //     );
    //

    } catch (err) {
        console.log(err);
    }
}
