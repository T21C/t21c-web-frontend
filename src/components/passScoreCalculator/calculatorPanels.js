// tuf-search: #calculatorPanels #passScoreCalculator
import { PrimaryPanel } from './panels/PrimaryPanel';
import { MissBudgetPanel } from './panels/MissBudgetPanel';
import { InversePanel } from './panels/InversePanel';
import { SpeedGridPanel } from './panels/SpeedGridPanel';
import { ComparePanel } from './panels/ComparePanel';
import { ReclearPanel } from './panels/ReclearPanel';
import { PlacementPanel } from './panels/PlacementPanel';
import { RankedImpactPanel } from './panels/RankedImpactPanel';

/**
 * Ordered registry — reorder / comment out entries to shuffle UI later.
 * slot: 'main' | 'tools' | 'context'
 */
export const CALCULATOR_PANELS = [
  { id: 'primary', slot: 'main', component: PrimaryPanel },
  { id: 'placement', slot: 'context', component: PlacementPanel },
  { id: 'ranked', slot: 'context', component: RankedImpactPanel },
  { id: 'reclear', slot: 'context', component: ReclearPanel },
  { id: 'missBudget', slot: 'tools', component: MissBudgetPanel },
  { id: 'inverse', slot: 'tools', component: InversePanel },
  { id: 'speedGrid', slot: 'tools', component: SpeedGridPanel },
  { id: 'compare', slot: 'tools', component: ComparePanel },
];

export function panelsForSlot(slot) {
  return CALCULATOR_PANELS.filter((p) => p.slot === slot);
}
