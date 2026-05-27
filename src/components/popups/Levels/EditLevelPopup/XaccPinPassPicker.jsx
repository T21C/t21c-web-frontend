// tuf-search: #XaccPinPassPicker #xaccCurve
import { useEffect, useRef } from 'react';
import { PassIcon } from '@/components/common/icons';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import {
  formatPassPickerLabel,
  formatPassPickerStats,
  resolvePassPickerName,
  resolvePassPlayerSubject,
} from '@/utils/xaccPinJudgements.js';
import { XaccPassPickerJudgementStrip } from './XaccPassPickerJudgementStrip.jsx';

export function XaccPinPassPicker({
  passes,
  loading,
  open,
  onToggle,
  onSelectPass,
  ariaLabel,
  loadingLabel,
  emptyLabel,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onToggle]);

  const handleSelect = (pass) => {
    onSelectPass(pass);
  };

  return (
    <div
      ref={rootRef}
      className="admin-level-xacc-curve-popup__pass-picker"
    >
      <button
        type="button"
        className={
          open
            ? 'admin-level-xacc-curve-popup__pass-picker-btn admin-level-xacc-curve-popup__pass-picker-btn--open'
            : 'admin-level-xacc-curve-popup__pass-picker-btn'
        }
        onClick={onToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={loading && passes.length === 0}
      >
        <PassIcon size="18px" color="currentColor" />
      </button>
      {open ? (
        <div
          className="admin-level-xacc-curve-popup__pass-picker-menu"
          role="listbox"
        >
          {loading ? (
            <p className="admin-level-xacc-curve-popup__pass-picker-status">
              {loadingLabel}
            </p>
          ) : null}
          {!loading && passes.length === 0 ? (
            <p className="admin-level-xacc-curve-popup__pass-picker-status">
              {emptyLabel}
            </p>
          ) : null}
          {!loading
            ? passes.map((pass) => (
                <button
                  key={pass.id}
                  type="button"
                  role="option"
                  className="admin-level-xacc-curve-popup__pass-picker-item"
                  aria-label={formatPassPickerLabel(pass)}
                  onClick={() => handleSelect(pass)}
                >
                  <UserAvatar
                    {...userAvatarUrls(resolvePassPlayerSubject(pass))}
                    className="admin-level-xacc-curve-popup__pass-picker-avatar"
                  />
                  <span className="admin-level-xacc-curve-popup__pass-picker-item-body">
                    <span className="admin-level-xacc-curve-popup__pass-picker-item-name">
                      {resolvePassPickerName(pass)}
                    </span>
                    <span className="admin-level-xacc-curve-popup__pass-picker-item-meta">
                      <span className="admin-level-xacc-curve-popup__pass-picker-item-stats">
                        {formatPassPickerStats(pass)}
                      </span>
                      <XaccPassPickerJudgementStrip pass={pass} />
                    </span>
                  </span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
