import type { ChatTestAction } from '../tests/SuccessTest'; // path adjust as needed

export const EdgeChatActions: ChatTestAction[] = [
  {
    id: 'add-edge',
    label: 'SR5.UseEdge',
    icon: 'fas fa-meteor',
    visible: (test) =>
      test.evaluated &&
      !!test.actor &&
      test.actor.getEdge().uses > 0 &&
      test.canPushTheLimit,
    enabled: (test) => test.canPushTheLimit,
    execute: async (test) => {
      await test.executeWithPushTheLimit();
    }
  },
  {
    id: 'reroll-fails',
    label: 'SR5.SecondChance',
    icon: 'fas fa-redo',
    visible: (test) =>
      test.evaluated &&
      !!test.actor &&
      test.actor.getEdge().uses > 0 &&
      test.canSecondChance,
    enabled: (test) => test.canSecondChance,
    execute: async (test) => {
      await test.executeWithSecondChance();
    }
  }
];
