import { DataDefaults } from '../data/DataDefaults';
import { PartsList } from '../parts/PartsList';
import { SuccessTest, SuccessTestData, TestOptions } from './SuccessTest';
import { Translation } from '../utils/strings';

export interface SkillTestData extends SuccessTestData {
  attribute: Shadowrun.ActorAttribute;
}

/**
 * SR4: Skill tests allow users to change the connected attribute.
 * (No limits in SR4.)
 */
export class SkillTest extends SuccessTest<SkillTestData> {
  // temporary selection information
  lastUsedAttribute: string;

  constructor(data, documents, options) {
    super(data, documents, options);
    this.lastUsedAttribute = this.data.attribute;
  }

  /**
   * Allow users to alter detailed skill values.
   * TODO: swap to an SR4 template (no limit dropdown).
   */
  override get _dialogTemplate() {
    // Change this to an SR4 template once you have it.
    return 'systems/shadowrun5e/dist/templates/apps/dialogs/skill-test-dialog.hbs';
  }

  /**
   * Show skill label as title instead of the generic success test label.
   */
  override get title() {
    if (!this.actor) return super.title;
    // TODO: rename SR5.Test key or replace with SR4.Test in your lang files
    return `${game.i18n.localize(this.actor.getSkillLabel(this.data.action.skill) as Translation)} ${game.i18n.localize('SR5.Test')}`;
  }

  /**
   * A SkillTest needs to store attribute selection (SR4: no limits).
   */
  override _prepareData(data: any, options: TestOptions) {
    data = super._prepareData(data, options);
    data.action = data.action || DataDefaults.createData('action_roll');

    // Preselect based on action.
    data.attribute = data.action.attribute;

    return data;
  }

  /**
   * Skill test provides a selection for attribute during TestDialog.
   */
  override prepareBaseValues() {
    this.prepareAttributeSelection();
    super.prepareBaseValues();
  }

  /**
   * Change out previous attribute with new selection.
   */
  prepareAttributeSelection() {
    if (!this.actor) return;

    const useSelection = this.data.attribute !== this.data.action.attribute;
    const selectedAttribute = useSelection ? this.data.attribute : this.data.action.attribute;

    const usedAttribute = this.actor.getAttribute(selectedAttribute);
    const lastUsedAttribute = this.actor.getAttribute(this.lastUsedAttribute);

    if (!usedAttribute || !lastUsedAttribute) return;

    const pool = new PartsList<number>(this.pool.mod);

    // Replace previous attribute with new one, without changing other modifiers.
    pool.removePart(lastUsedAttribute.label);
    pool.addPart(usedAttribute.label, usedAttribute.value);

    this.lastUsedAttribute = selectedAttribute;
    this.data.action.attribute = selectedAttribute;
  }
}
