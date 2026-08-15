// tuf-search: #PassScoreCalculatorResults #passScoreCalculator
import { memo, useState } from 'react';
import { panelsForSlot } from './calculatorPanels';

function SlotPanels({ slot, result, difficultyDict }) {
  return panelsForSlot(slot).map(({ id, component: Panel }) => (
    <Panel key={id} result={result} difficultyDict={difficultyDict} />
  ));
}

function CollapsibleSlot({ title, slot, result, difficultyDict, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="pass-score-calculator__details"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open ? (
        <div className="pass-score-calculator__details-body">
          <SlotPanels slot={slot} result={result} difficultyDict={difficultyDict} />
        </div>
      ) : null}
    </details>
  );
}

function PassScoreCalculatorResultsInner({ result, difficultyDict }) {
  if (!result) return null;

  return (
    <div className="pass-score-calculator__results">
      <div className="pass-score-calculator__slot pass-score-calculator__slot--main">
        <SlotPanels slot="main" result={result} difficultyDict={difficultyDict} />
      </div>

      <CollapsibleSlot
        title="Context"
        slot="context"
        result={result}
        difficultyDict={difficultyDict}
        defaultOpen
      />

      <CollapsibleSlot
        title="Tools"
        slot="tools"
        result={result}
        difficultyDict={difficultyDict}
      />
    </div>
  );
}

export const PassScoreCalculatorResults = memo(PassScoreCalculatorResultsInner);
